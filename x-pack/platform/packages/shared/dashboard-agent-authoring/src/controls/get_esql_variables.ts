/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { isSection } from '@kbn/agent-builder-dashboards-common';
import { ESQL_CONTROL } from '@kbn/controls-constants';
import { isQueryESQLControl, type ESQLControlVariable } from '@kbn/esql-types';
import { getESQLControlVariablesFromState } from '@kbn/esql-utils';
import type { ResolveEsqlControlColumnType } from '../types';

const isNumericLooking = (option: unknown): boolean =>
  typeof option === 'string' && option.trim() !== '' && !isNaN(Number(option));

/**
 * The ES|QL variables published by the ES|QL controls of a dashboard, pinned or in the grid. The
 * values of a query-based control are cast by the column type its query returns, as a live control does.
 */
export const getEsqlVariables = async ({
  pinnedPanels = [],
  panels = [],
  resolveColumnType,
}: {
  pinnedPanels?: DashboardAttachmentData['pinned_panels'];
  panels?: DashboardAttachmentData['panels'];
  resolveColumnType?: ResolveEsqlControlColumnType;
}): Promise<ESQLControlVariable[]> => {
  const gridPanels = panels.flatMap((widget) => (isSection(widget) ? widget.panels : [widget]));
  const configs = [...pinnedPanels, ...gridPanels].flatMap(({ type, config }) =>
    type === ESQL_CONTROL ? [config] : []
  );

  const variables = getESQLControlVariablesFromState(configs);
  if (!resolveColumnType) return variables;

  // Only a selection that looks like a number can end up cast differently.
  const columnTypes = await Promise.all(
    configs.map(async (config) => {
      if (
        typeof config !== 'object' ||
        config === null ||
        !isQueryESQLControl(config) ||
        !Array.isArray(config.selected_options) ||
        !config.selected_options.some(isNumericLooking)
      ) {
        return [];
      }
      try {
        const columnType = await resolveColumnType({
          query: config.esql_query,
          esqlVariables: variables,
        });
        return columnType ? [[config.variable_name, columnType] as const] : [];
      } catch {
        return [];
      }
    })
  );

  return getESQLControlVariablesFromState(configs, Object.fromEntries(columnTypes.flat()));
};

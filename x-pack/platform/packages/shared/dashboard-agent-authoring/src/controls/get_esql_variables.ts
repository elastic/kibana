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

interface EsqlControlEntry {
  config: unknown;
  /** The section the control is in, which is where its variable applies. */
  group?: string;
}

const toVariables = (
  entries: EsqlControlEntry[],
  columnTypes: Record<string, string> = {}
): ESQLControlVariable[] =>
  entries.flatMap(({ config, group }) =>
    getESQLControlVariablesFromState([config], columnTypes).map((variable) =>
      group ? { ...variable, meta: { group } } : variable
    )
  );

/** The variables a panel in the section sees: those of controls outside sections, and of its own section. */
export const getEsqlVariablesForSection = (
  variables: ESQLControlVariable[],
  sectionId: string | null | undefined
): ESQLControlVariable[] =>
  variables.filter(({ meta }) => !meta?.group || meta.group === sectionId);

/**
 * The ES|QL variables published by the ES|QL controls of a dashboard, pinned or in the grid. A control
 * in a section applies only to that section. The values of a query-based control are cast by the
 * column type its query returns, as a live control does.
 */
export const getEsqlVariables = async ({
  pinnedPanels = [],
  panels = [],
  timeRange,
  resolveColumnType,
}: {
  pinnedPanels?: DashboardAttachmentData['pinned_panels'];
  panels?: DashboardAttachmentData['panels'];
  timeRange?: DashboardAttachmentData['time_range'];
  resolveColumnType?: ResolveEsqlControlColumnType;
}): Promise<ESQLControlVariable[]> => {
  const toEntries = (
    controls: ReadonlyArray<Record<string, unknown>>,
    group?: string
  ): EsqlControlEntry[] =>
    controls.flatMap(({ type, config }) => (type === ESQL_CONTROL ? [{ config, group }] : []));
  const entries = [
    ...toEntries(pinnedPanels),
    ...panels.flatMap((widget) =>
      isSection(widget) ? toEntries(widget.panels, widget.id) : toEntries([widget])
    ),
  ];

  const variables = toVariables(entries);
  if (!resolveColumnType) return variables;

  // Only a selection that looks like a number can end up cast differently.
  const columnTypes = await Promise.all(
    entries.map(async ({ config, group }) => {
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
          esqlVariables: getEsqlVariablesForSection(variables, group),
          timeRange,
        });
        return columnType ? [[config.variable_name, columnType] as const] : [];
      } catch {
        return [];
      }
    })
  );

  return toVariables(entries, Object.fromEntries(columnTypes.flat()));
};

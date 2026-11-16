/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { isSection } from '@kbn/agent-builder-dashboards-common';
import { ESQL_CONTROL } from '@kbn/controls-constants';
import {
  isQueryESQLControl,
  type ESQLControlVariable,
  type QueryESQLControl,
} from '@kbn/esql-types';
import { getESQLControlVariablesFromState, getESQLQueryVariables } from '@kbn/esql-utils';
import { getControlId, getSectionIdByPanelId } from '../dashboard_state';
import type { ResolveEsqlVariables } from '../resolve_panel';
import type { ResolveEsqlControlColumnType } from '../types';

const isNumericLooking = (option: unknown): boolean =>
  typeof option === 'string' && option.trim() !== '' && !isNaN(Number(option));

const asQueryControl = (config: unknown): QueryESQLControl | undefined =>
  typeof config === 'object' && config !== null && isQueryESQLControl(config) ? config : undefined;

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
const getEsqlVariablesForSection = (
  variables: ESQLControlVariable[],
  sectionId: string | null | undefined
): ESQLControlVariable[] =>
  variables.filter(({ meta }) => !meta?.group || meta.group === sectionId);

/**
 * Reads the ES|QL controls of a dashboard, pinned or in the grid, and returns a function that gives
 * the resolver of the variables a panel in a given section sees. A control in a section applies only
 * to that section.
 *
 * The values of a query-based control are cast by the column type its query returns, as a live control
 * does. Finding it takes a request, so it is made only for a control whose variable the queries refer
 * to and whose selection looks like a number, and once per control.
 *
 * Call the result with a panel's section to get that panel's `ResolveEsqlVariables`.
 */
export const createEsqlVariablesResolver = ({
  pinnedPanels = [],
  panels = [],
  sectionIdByPanelId = getSectionIdByPanelId({ panels }),
  removedIds = new Set<string>(),
  timeRange,
  resolveColumnType,
}: {
  pinnedPanels?: DashboardAttachmentData['pinned_panels'];
  panels?: DashboardAttachmentData['panels'];
  /** The section of each panel once the call is applied, which sets where a control in the grid applies. */
  sectionIdByPanelId?: ReadonlyMap<string, string | null>;
  /** Ids the call removes: a control that is removed publishes no variable. */
  removedIds?: ReadonlySet<string>;
  timeRange?: DashboardAttachmentData['time_range'];
  resolveColumnType?: ResolveEsqlControlColumnType;
}): ((sectionId: string | null | undefined) => ResolveEsqlVariables) => {
  const gridPanels = panels.flatMap((widget) => (isSection(widget) ? widget.panels : [widget]));
  const entries: EsqlControlEntry[] = [
    ...pinnedPanels.flatMap((control) => {
      const id = getControlId(control);
      const isRemoved = id !== undefined && removedIds.has(id);
      return control.type === ESQL_CONTROL && !isRemoved ? [{ config: control.config }] : [];
    }),
    ...gridPanels.flatMap(({ id, type, config }) => {
      return type === ESQL_CONTROL && !removedIds.has(id)
        ? [{ config, group: sectionIdByPanelId.get(id) ?? undefined }]
        : [];
    }),
  ];
  const variables = toVariables(entries);
  const columnTypes = new Map<EsqlControlEntry, Promise<string | undefined>>();

  const getColumnType = (entry: EsqlControlEntry): Promise<string | undefined> => {
    const control = asQueryControl(entry.config);
    if (
      !resolveColumnType ||
      !control ||
      !Array.isArray(control.selected_options) ||
      !control.selected_options.some(isNumericLooking)
    ) {
      return Promise.resolve(undefined);
    }
    let columnType = columnTypes.get(entry);
    if (!columnType) {
      columnType = resolveColumnType({
        query: control.esql_query,
        esqlVariables: getEsqlVariablesForSection(variables, entry.group),
        timeRange,
      }).catch(() => undefined);
      columnTypes.set(entry, columnType);
    }
    return columnType;
  };

  return (sectionId) => {
    const resolveEsqlVariables: ResolveEsqlVariables = async (
      queries,
      { anyVariable = false } = {}
    ) => {
      const usedNames = new Set(queries.flatMap((query) => getESQLQueryVariables(query)));
      const types: Record<string, string> = {};
      await Promise.all(
        entries.map(async (entry) => {
          const { config, group } = entry;
          const name = asQueryControl(config)?.variable_name;
          if (!name || !(anyVariable || usedNames.has(name)) || (group && group !== sectionId))
            return;
          const columnType = await getColumnType(entry);
          if (columnType) types[name] = columnType;
        })
      );
      return getEsqlVariablesForSection(toVariables(entries, types), sectionId);
    };
    return resolveEsqlVariables;
  };
};

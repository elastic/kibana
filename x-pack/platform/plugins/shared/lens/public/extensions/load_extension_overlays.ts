/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IUiSettingsClient, KibanaExecutionContext } from '@kbn/core/public';
import {
  buildEsQuery,
  isOfAggregateQueryType,
  type AggregateQuery,
  type Filter,
  type Query,
  type TimeRange,
} from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { formatESQLColumns, getESQLResults } from '@kbn/esql-utils';
import { getEsQueryConfig, getTime, UI_SETTINGS } from '@kbn/data-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type {
  LensExtensionLayer,
  LensExtensionsRuntimeConfig,
  LensRuntimeState,
  TextBasedPersistedState,
} from '@kbn/lens-common';
import type { LensExtensionRegistry } from './extension_registry';
import { getExtensionMatchContext, resolveActiveExtensions } from './resolve_active_extensions';
import { runActiveExtensions, type LensExtensionsRunResult } from './run_active_extensions';

const DEFAULT_TIME_FIELD = '@timestamp';
const EMPTY_RESULT: LensExtensionsRunResult = { overlays: [], failures: [] };

interface ExtensionsSearchContext {
  readonly timeRange?: TimeRange;
  readonly filters: Filter[];
  readonly query: Array<Query | AggregateQuery>;
  readonly esqlVariables?: ESQLControlVariable[];
}

interface LoadExtensionOverlaysParams {
  readonly registry: LensExtensionRegistry;
  readonly attributes: LensRuntimeState['attributes'];
  readonly executionContext?: KibanaExecutionContext;
  readonly runtimeConfig?: LensExtensionsRuntimeConfig;
  readonly searchContext: ExtensionsSearchContext;
  readonly abortSignal: AbortSignal;
  readonly data: DataPublicPluginStart;
  readonly uiSettings: IUiSettingsClient;
}

const getLayerTimeField = (
  attributes: LensRuntimeState['attributes'],
  { layerId }: LensExtensionLayer
): string => {
  const textBased = attributes.state.datasourceStates.textBased as
    | TextBasedPersistedState
    | undefined;
  return textBased?.layers[layerId]?.timeField ?? DEFAULT_TIME_FIELD;
};

/** Resolves the extensions matching the chart and fetches their overlays with the chart's search scope. */
export const loadExtensionOverlays = async ({
  registry,
  attributes,
  executionContext,
  runtimeConfig,
  searchContext,
  abortSignal,
  data,
  uiSettings,
}: LoadExtensionOverlaysParams): Promise<LensExtensionsRunResult> => {
  const context = getExtensionMatchContext({ attributes, executionContext });
  if (!context) {
    return EMPTY_RESULT;
  }
  const activeExtensions = resolveActiveExtensions({
    extensions: registry.getAll(),
    context,
    runtimeConfig,
  });
  if (!activeExtensions.length) {
    return EMPTY_RESULT;
  }

  const { timeRange, filters, query, esqlVariables } = searchContext;
  const kqlQueries = query.filter((entry): entry is Query => !isOfAggregateQueryType(entry));
  const esQueryConfig = getEsQueryConfig(uiSettings);
  const timezone = uiSettings.get<string>(UI_SETTINGS.DATEFORMAT_TZ);

  const executeEsql = async (esql: string, timeField: string): Promise<Datatable> => {
    const timeFilter = timeRange
      ? getTime(undefined, timeRange, { fieldName: timeField })
      : undefined;
    const filter = buildEsQuery(
      undefined,
      kqlQueries,
      timeFilter ? [...filters, timeFilter] : filters,
      esQueryConfig
    );
    const { response } = await getESQLResults({
      esqlQuery: esql,
      search: data.search.search,
      signal: abortSignal,
      filter,
      timeRange,
      variables: esqlVariables,
      timezone,
      executionContext,
    });
    const columns = formatESQLColumns(response.columns);
    const rows = response.values.map((values) =>
      Object.fromEntries(columns.map(({ id }, index) => [id, values[index]]))
    );
    return { type: 'datatable', columns, rows };
  };

  return runActiveExtensions({
    activeExtensions,
    abortSignal,
    getFetchContext: (layer) => ({
      layer,
      timeRange,
      filters,
      query: kqlQueries[0],
      esqlVariables,
      abortSignal,
      executeEsql: (esql) => executeEsql(esql, getLayerTimeField(attributes, layer)),
    }),
  });
};

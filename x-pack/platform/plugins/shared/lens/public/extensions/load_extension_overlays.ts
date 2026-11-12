/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaExecutionContext } from '@kbn/core/public';
import {
  isOfAggregateQueryType,
  type AggregateQuery,
  type Filter,
  type ProjectRouting,
  type Query,
  type TimeRange,
} from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { RequestAdapter } from '@kbn/inspector-plugin/common';
import type {
  LensExtensionLayer,
  LensExtensionRequestMeta,
  LensExtensionsRuntimeConfig,
  LensRuntimeState,
  TextBasedLayer,
  TextBasedPersistedState,
} from '@kbn/lens-common';
import type { LensExtensionRegistry } from './extension_registry';
import { getExtensionMatchContext, resolveActiveExtensions } from './resolve_active_extensions';
import { runActiveExtensions, type LensExtensionsRunResult } from './run_active_extensions';

const EMPTY_RESULT: LensExtensionsRunResult = { overlays: [], failures: [] };

interface ExtensionsSearchContext {
  readonly timeRange?: TimeRange;
  readonly filters: Filter[];
  readonly query: Array<Query | AggregateQuery>;
  readonly esqlVariables?: ESQLControlVariable[];
  readonly projectRouting?: ProjectRouting;
  readonly isApproximate?: boolean;
}

interface LoadExtensionOverlaysParams {
  readonly registry: LensExtensionRegistry;
  readonly attributes: LensRuntimeState['attributes'];
  readonly executionContext?: KibanaExecutionContext;
  readonly runtimeConfig?: LensExtensionsRuntimeConfig;
  readonly searchContext: ExtensionsSearchContext;
  readonly searchSessionId?: string;
  readonly requestsAdapter?: RequestAdapter;
  readonly abortSignal: AbortSignal;
  readonly data: DataPublicPluginStart;
}

const getTextBasedLayer = (
  attributes: LensRuntimeState['attributes'],
  { layerId }: LensExtensionLayer
): TextBasedLayer | undefined =>
  (attributes.state.datasourceStates.textBased as TextBasedPersistedState | undefined)?.layers[
    layerId
  ];

/** Resolves the extensions matching the chart and fetches their overlays with the chart's search scope. */
export const loadExtensionOverlays = async ({
  registry,
  attributes,
  executionContext,
  runtimeConfig,
  searchContext,
  searchSessionId,
  requestsAdapter,
  abortSignal,
  data,
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

  const { timeRange, filters, query, esqlVariables, projectRouting, isApproximate } = searchContext;
  const kqlQueries = query.filter((entry): entry is Query => !isOfAggregateQueryType(entry));

  const executeEsql = async (
    esql: string,
    layer: LensExtensionLayer,
    { title, description }: LensExtensionRequestMeta
  ): Promise<Datatable> => {
    const textBasedLayer = getTextBasedLayer(attributes, layer);
    const ignoreGlobalFilters = Boolean(textBasedLayer?.ignoreGlobalFilters);
    const { datatable } = await data.search.esql(
      {
        query: esql,
        kibanaQueryContext: {
          timeRange,
          timeField: textBasedLayer?.timeField,
          kibanaFilters: ignoreGlobalFilters ? [] : filters,
          kqlQuery: ignoreGlobalFilters ? undefined : kqlQueries,
          esqlVariables,
        },
        approximation: isApproximate,
        projectRouting,
        dropNullColumns: true,
        includeExecutionMetadata: true,
        columnMetadata: true,
      },
      {
        abortSignal,
        sessionId: searchSessionId,
        executionContext,
        includeDataTable: true,
        ...(requestsAdapter ? { inspector: { adapter: requestsAdapter, title, description } } : {}),
      }
    );
    if (!datatable) {
      throw new Error(`The "${title}" request returned no datatable`);
    }
    return datatable;
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
      executeEsql: (esql, meta) => executeEsql(esql, layer, meta),
    }),
  });
};

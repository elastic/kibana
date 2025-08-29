/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IUiSettingsClient,
  KibanaRequest,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { DataViewsContract } from '@kbn/data-views-plugin/common';
import { tap, map, lastValueFrom } from 'rxjs';
import { ESQL_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import type {
  IKibanaSearchRequest,
  IKibanaSearchResponse,
  ISearchOptions,
} from '@kbn/search-types';
import { RULE_SAVED_OBJECT_TYPE } from '..';
import { getEsRequestTimeout } from '../lib';
import type { WrappedScopedClusterClient } from '../lib/wrap_scoped_cluster_client';
import { createWrappedScopedClusterClientFactory } from '../lib/wrap_scoped_cluster_client';
import type { WrappedSearchSourceClient } from '../lib/wrap_search_source_client';
import { wrapSearchSourceClient } from '../lib/wrap_search_source_client';
import type { RuleMonitoringService } from '../monitoring/rule_monitoring_service';
import type { RuleResultService } from '../monitoring/rule_result_service';
import type {
  AsyncSearchParams,
  AsyncSearchStrategies,
  PublicRuleMonitoringService,
  PublicRuleResultService,
} from '../types';
import { withAlertingSpan } from './lib';
import type { TaskRunnerContext } from './types';

interface GetExecutorServicesOpts {
  context: TaskRunnerContext;
  fakeRequest: KibanaRequest;
  abortController: AbortController;
  logger: Logger;
  ruleMonitoringService: RuleMonitoringService;
  ruleResultService: RuleResultService;
  ruleData: { name: string; alertTypeId: string; id: string; spaceId: string };
  ruleTaskTimeout?: string;
}

export interface AsyncSearchClient<T extends AsyncSearchParams> {
  getMetrics: () => {
    numSearches: number;
    esSearchDurationMs: number;
    totalSearchDurationMs: number;
  };
  search: ({
    request,
    options,
  }: {
    request: IKibanaSearchRequest<T>;
    options?: ISearchOptions;
  }) => Promise<IKibanaSearchResponse>;
}

export interface ExecutorServices {
  ruleMonitoringService: PublicRuleMonitoringService;
  ruleResultService: PublicRuleResultService;
  savedObjectsClient: SavedObjectsClientContract;
  uiSettingsClient: IUiSettingsClient;
  wrappedScopedClusterClient: WrappedScopedClusterClient;
  getDataViews: () => Promise<DataViewsContract>;
  getWrappedSearchSourceClient: () => Promise<WrappedSearchSourceClient>;
  getAsyncSearchClient: <T extends AsyncSearchParams>(
    strategy: AsyncSearchStrategies
  ) => AsyncSearchClient<T>;
}

export const getExecutorServices = (opts: GetExecutorServicesOpts): ExecutorServices => {
  const { context, abortController, fakeRequest, logger, ruleData, ruleTaskTimeout } = opts;

  const wrappedClientOptions = {
    rule: ruleData,
    logger,
    abortController,
    // Set the ES request timeout to the rule task timeout
    requestTimeout: getEsRequestTimeout(logger, ruleTaskTimeout),
  };

  const scopedClusterClient = context.elasticsearch.client.asScoped(fakeRequest);
  const wrappedScopedClusterClient = createWrappedScopedClusterClientFactory({
    ...wrappedClientOptions,
    scopedClusterClient,
  });

  const savedObjectsClient = context.savedObjects.getScopedClient(fakeRequest, {
    includedHiddenTypes: [RULE_SAVED_OBJECT_TYPE, 'action'],
  });

  const uiSettingsClient = context.uiSettings.asScopedToClient(savedObjectsClient);

  return {
    ruleMonitoringService: opts.ruleMonitoringService.getLastRunMetricsSetters(),
    ruleResultService: opts.ruleResultService.getLastRunSetters(),
    savedObjectsClient,
    uiSettingsClient,
    wrappedScopedClusterClient,
    getDataViews: async () => {
      const dataViews = await withAlertingSpan('alerting:get-data-views-factory', () =>
        context.dataViews.dataViewsServiceFactory(
          savedObjectsClient,
          scopedClusterClient.asInternalUser
        )
      );
      return dataViews;
    },
    getWrappedSearchSourceClient: async () => {
      const searchSourceClient = await withAlertingSpan('alerting:get-search-source-client', () =>
        context.data.search.searchSource.asScoped(fakeRequest)
      );
      return wrapSearchSourceClient({
        ...wrappedClientOptions,
        searchSourceClient,
      });
    },

    getAsyncSearchClient: (strategy = ESQL_SEARCH_STRATEGY) => {
      const start = Date.now();
      let numSearches = 0;
      let esSearchDurationMs = 0;
      let totalSearchDurationMs = 0;

      const client = context.data.search.asScoped(fakeRequest);

      return {
        getMetrics: () => {
          return {
            numSearches,
            esSearchDurationMs,
            totalSearchDurationMs,
          };
        },
        search: ({ request, options }) => {
          return lastValueFrom(
            client
              .search(request, {
                ...options,
                strategy,
              })
              .pipe(
                map((response) => {
                  return response;
                }),
                tap((result) => {
                  const durationMs = Date.now() - start;
                  numSearches++;
                  esSearchDurationMs += result.rawResponse.took ?? 0;
                  totalSearchDurationMs += durationMs;
                })
              )
          );
        },
      };
    },
  };
};

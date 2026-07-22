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
import type { AsScopedOptions } from '@kbn/core-elasticsearch-server';
import { RULE_SAVED_OBJECT_TYPE } from '..';
import { getEsRequestTimeout } from '../lib';
import type { CpsData } from '../types';
import { resolveCpsData } from './resolve_cps_data';
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
import { type AsyncSearchClient, type TaskRunnerContext } from './types';
import { wrapAsyncSearchClient } from '../lib/wrap_async_search_client';

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
  getCpsData: () => Promise<CpsData>;
}

// Default project routing for rules when CPS is enabled is 'space'
// If there is no default routing defined for the space, it falls back to 'all' when CPS is enabled
const PROJECT_ROUTING_FOR_RULES = 'space';
const projectRouting: AsScopedOptions = {
  projectRouting: PROJECT_ROUTING_FOR_RULES,
};

export const getExecutorServices = (opts: GetExecutorServicesOpts): ExecutorServices => {
  const { context, abortController, fakeRequest, logger, ruleData, ruleTaskTimeout } = opts;

  const wrappedClientOptions = {
    rule: ruleData,
    logger,
    abortController,
    // Set the ES request timeout to the rule task timeout
    requestTimeout: getEsRequestTimeout(logger, ruleTaskTimeout),
  };

  const scopedClusterClient = context.elasticsearch.client.asScoped(fakeRequest, projectRouting);

  const wrappedScopedClusterClient = createWrappedScopedClusterClientFactory({
    ...wrappedClientOptions,
    scopedClusterClient,
  });

  const savedObjectsClient = context.savedObjects.getScopedClient(fakeRequest, {
    includedHiddenTypes: [RULE_SAVED_OBJECT_TYPE, 'action'],
  });

  const uiSettingsClient = context.uiSettings.asScopedToClient(savedObjectsClient);

  return {
    ruleMonitoringService: opts.ruleMonitoringService.getSetters(),
    ruleResultService: opts.ruleResultService.getLastRunSetters(),
    savedObjectsClient,
    uiSettingsClient,
    wrappedScopedClusterClient,
    getDataViews: async () => {
      const dataViews = await withAlertingSpan('alerting:get-data-views-factory', () =>
        // Use the current-user client so `fieldCaps` requests carry the rule's UIAM auth and fan
        // out across the space's CPS-connected projects, consistent with the search clients. The
        // internal user is always origin-only and is not CPS-capable.
        context.dataViews.dataViewsServiceFactory(
          savedObjectsClient,
          scopedClusterClient.asCurrentUser
        )
      );
      return dataViews;
    },
    getWrappedSearchSourceClient: async () => {
      const searchSourceClient = await withAlertingSpan('alerting:get-search-source-client', () =>
        context.data.search.searchSource.asScoped(fakeRequest, projectRouting)
      );
      return wrapSearchSourceClient({
        ...wrappedClientOptions,
        searchSourceClient,
      });
    },

    getAsyncSearchClient: (strategy) => {
      const client = context.data.search.asScoped(fakeRequest, projectRouting);

      return wrapAsyncSearchClient({
        logger,
        rule: ruleData,
        strategy,
        client,
        abortController,
      });
    },

    // `resolveCpsData` reads two different kinds of ES endpoint:
    // - `/_project_routing/{npre}` (routing expression) is operator-only and user-agnostic, so it
    //   is called as the internal user to avoid the `security_exception` a rule's scoped API key
    //   raises (see #276771).
    // - `/_project/tags` (linked projects) is role-filtered, so it is called as the current user to
    //   reflect the projects the rule execution actually targets.
    getCpsData: () =>
      resolveCpsData(
        scopedClusterClient.asInternalUser,
        scopedClusterClient.asCurrentUser,
        ruleData.spaceId,
        logger
      ),
  };
};

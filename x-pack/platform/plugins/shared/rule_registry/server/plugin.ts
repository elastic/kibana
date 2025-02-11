/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Subject, ReplaySubject, Observable, map, distinctUntilChanged } from 'rxjs';
import {
  PluginInitializerContext,
  Plugin,
  CoreSetup,
  Logger,
  KibanaRequest,
  CoreStart,
  IContextProvider,
  CoreStatus,
  ServiceStatusLevels,
} from '@kbn/core/server';

import type { AlertingServerSetup, AlertingServerStart } from '@kbn/alerting-plugin/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type {
  PluginStart as DataPluginStart,
  PluginSetup as DataPluginSetup,
} from '@kbn/data-plugin/server';

import type { RuleRegistryPluginConfig } from './config';
import { type IRuleDataService, RuleDataService, Dataset } from './rule_data_plugin_service';
import { AlertsClientFactory } from './alert_data_client/alerts_client_factory';
import type { AlertsClient } from './alert_data_client/alerts_client';
import type { RacApiRequestHandlerContext, RacRequestHandlerContext } from './types';
import { defineRoutes } from './routes';
import { ruleRegistrySearchStrategyProvider, RULE_SEARCH_STRATEGY_NAME } from './search_strategy';

export interface RuleRegistryPluginSetupDependencies {
  security?: SecurityPluginSetup;
  data: DataPluginSetup;
  alerting: AlertingServerSetup;
}

export interface RuleRegistryPluginStartDependencies {
  alerting: AlertingServerStart;
  data: DataPluginStart;
  spaces?: SpacesPluginStart;
}

export interface RuleRegistryPluginSetupContract {
  ruleDataService: IRuleDataService;
  dataset: typeof Dataset;
}

export interface RuleRegistryPluginStartContract {
  getRacClientWithRequest: (req: KibanaRequest) => Promise<AlertsClient>;
  alerting: AlertingServerStart;
}

export class RuleRegistryPlugin
  implements
    Plugin<
      RuleRegistryPluginSetupContract,
      RuleRegistryPluginStartContract,
      RuleRegistryPluginSetupDependencies,
      RuleRegistryPluginStartDependencies
    >
{
  private readonly config: RuleRegistryPluginConfig;
  private readonly logger: Logger;
  private readonly kibanaVersion: string;
  private readonly alertsClientFactory: AlertsClientFactory;
  private ruleDataService: IRuleDataService | null;
  private security: SecurityPluginSetup | undefined;
  private pluginStop$: Subject<void>;

  constructor(initContext: PluginInitializerContext) {
    this.config = initContext.config.get<RuleRegistryPluginConfig>();
    this.logger = initContext.logger.get();
    this.kibanaVersion = initContext.env.packageInfo.version;
    this.ruleDataService = null;
    this.alertsClientFactory = new AlertsClientFactory();
    this.pluginStop$ = new ReplaySubject(1);
  }

  public setup(
    core: CoreSetup<RuleRegistryPluginStartDependencies, RuleRegistryPluginStartContract>,
    plugins: RuleRegistryPluginSetupDependencies
  ): RuleRegistryPluginSetupContract {
    const { logger, kibanaVersion } = this;

    const elasticsearchAndSOAvailability$ = getElasticsearchAndSOAvailability(core.status.core$);

    const startDependencies = core.getStartServices().then(([coreStart, pluginStart]) => {
      return {
        core: coreStart,
        ...pluginStart,
      };
    });

    this.security = plugins.security;

    const dataStreamAdapter = plugins.alerting.getDataStreamAdapter();

    this.ruleDataService = new RuleDataService({
      logger,
      kibanaVersion,
      disabledRegistrationContexts: this.config.write.disabledRegistrationContexts,
      isWriteEnabled: this.config.write.enabled,
      isWriterCacheEnabled: this.config.write.cache.enabled,
      getClusterClient: async () => {
        const deps = await startDependencies;
        return deps.core.elasticsearch.client.asInternalUser;
      },
      frameworkAlerts: plugins.alerting.frameworkAlerts,
      pluginStop$: this.pluginStop$,
      dataStreamAdapter,
      elasticsearchAndSOAvailability$,
    });

    this.ruleDataService.initializeService();

    core
      .getStartServices()
      .then(([_, depsStart]) => {
        const ruleRegistrySearchStrategy = ruleRegistrySearchStrategyProvider(
          depsStart.data,
          depsStart.alerting,
          logger,
          plugins.security,
          depsStart.spaces
        );

        plugins.data.search.registerSearchStrategy(
          RULE_SEARCH_STRATEGY_NAME,
          ruleRegistrySearchStrategy
        );
      })
      .catch(() => {});

    // ALERTS ROUTES
    const router = core.http.createRouter<RacRequestHandlerContext>();
    core.http.registerRouteHandlerContext<RacRequestHandlerContext, 'rac'>(
      'rac',
      this.createRouteHandlerContext()
    );

    defineRoutes(router);

    return {
      ruleDataService: this.ruleDataService,
      dataset: Dataset,
    };
  }

  public start(
    core: CoreStart,
    plugins: RuleRegistryPluginStartDependencies
  ): RuleRegistryPluginStartContract {
    const { logger, alertsClientFactory, ruleDataService, security } = this;

    alertsClientFactory.initialize({
      logger,
      esClient: core.elasticsearch.client.asInternalUser,
      // NOTE: Alerts share the authorization client with the alerting plugin
      async getAlertingAuthorization(request: KibanaRequest) {
        return plugins.alerting.getAlertingAuthorizationWithRequest(request);
      },
      securityPluginSetup: security,
      ruleDataService,
      getRuleType: plugins.alerting.getType,
      getRuleList: plugins.alerting.listTypes,
      getAlertIndicesAlias: plugins.alerting.getAlertIndicesAlias,
    });

    const getRacClientWithRequest = async (request: KibanaRequest) => {
      return alertsClientFactory.create(request);
    };

    return {
      getRacClientWithRequest,
      alerting: plugins.alerting,
    };
  }

  private createRouteHandlerContext = (): IContextProvider<RacRequestHandlerContext, 'rac'> => {
    const { alertsClientFactory } = this;
    return function alertsRouteHandlerContext(context, request): RacApiRequestHandlerContext {
      return {
        getAlertsClient: async () => {
          const createdClient = await alertsClientFactory.create(request);
          return createdClient;
        },
      };
    };
  };

  public stop() {
    this.pluginStop$.next();
    this.pluginStop$.complete();
  }
}

function getElasticsearchAndSOAvailability(core$: Observable<CoreStatus>): Observable<boolean> {
  return core$.pipe(
    map(
      ({ elasticsearch, savedObjects }) =>
        elasticsearch.level === ServiceStatusLevels.available &&
        savedObjects.level === ServiceStatusLevels.available
    ),
    distinctUntilChanged()
  );
}

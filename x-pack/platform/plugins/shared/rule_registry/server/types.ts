/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomRequestHandlerContext, SavedObjectsClientContract } from '@kbn/core/server';
import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleTypeParams,
  RuleTypeState,
} from '@kbn/alerting-plugin/common';
import type {
  AlertingServerStart,
  RuleExecutorOptions,
  RuleExecutorServices,
  RuleType,
} from '@kbn/alerting-plugin/server';
import type { AlertsClient } from './alert_data_client/alerts_client';
import { DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';

type SimpleAlertType<
  TState extends RuleTypeState,
  TParams extends RuleTypeParams = {},
  TAlertInstanceContext extends AlertInstanceContext = {}
> = RuleType<TParams, TParams, TState, AlertInstanceState, TAlertInstanceContext, string, string>;

export type AlertTypeExecutor<
  TState extends RuleTypeState,
  TParams extends RuleTypeParams = {},
  TAlertInstanceContext extends AlertInstanceContext = {},
  TServices extends Record<string, any> = {}
> = (
  options: Parameters<SimpleAlertType<TState, TParams, TAlertInstanceContext>['executor']>[0] & {
    services: TServices;
  }
) => Promise<{ state: TState }>;

export type AlertTypeWithExecutor<
  TState extends RuleTypeState = {},
  TParams extends RuleTypeParams = {},
  TAlertInstanceContext extends AlertInstanceContext = {},
  TServices extends Record<string, any> = {}
> = Omit<
  RuleType<TParams, TParams, TState, AlertInstanceState, TAlertInstanceContext, string, string>,
  'executor'
> & {
  executor: AlertTypeExecutor<TState, TParams, TAlertInstanceContext, TServices>;
};

export type AlertExecutorOptionsWithExtraServices<
  Params extends RuleTypeParams = never,
  State extends RuleTypeState = never,
  InstanceState extends AlertInstanceState = never,
  InstanceContext extends AlertInstanceContext = never,
  ActionGroupIds extends string = never,
  TExtraServices extends {} = never
> = Omit<
  RuleExecutorOptions<Params, State, InstanceState, InstanceContext, ActionGroupIds>,
  'services'
> & {
  services: RuleExecutorServices<InstanceState, InstanceContext, ActionGroupIds> & TExtraServices;
};

/**
 * @public
 */
export interface RacApiRequestHandlerContext {
  getAlertsClient: () => Promise<AlertsClient>;
  alerting: AlertingServerStart;
  dataViews: DataViewsServerPluginStart;
  savedObjectsClient: SavedObjectsClientContract;
}

/**
 * @internal
 */
export type RacRequestHandlerContext = CustomRequestHandlerContext<{
  rac: RacApiRequestHandlerContext;
}>;

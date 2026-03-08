/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import type { ActionsPublicPluginSetup } from '@kbn/actions-plugin/public';
import type { ConsolePluginSetup, ConsolePluginStart } from '@kbn/console-plugin/public';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/public';
import type { ManagementSetup } from '@kbn/management-plugin/public';
import type { MlPluginSetup, MlPluginStart } from '@kbn/ml-plugin/public';
import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { ServerlessPluginSetup, ServerlessPluginStart } from '@kbn/serverless/public';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { CloudConnectedPluginStart } from '@kbn/cloud-connect-plugin/public';
import type { ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';
import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';

export * from '../common/types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchInferenceEndpointsPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchInferenceEndpointsPluginStart {}

export interface AppPluginStartDependencies {
  history: AppMountParameters['history'];
  share: SharePluginStart;
  console?: ConsolePluginStart;
  licensing: LicensingPluginStart;
  ml: MlPluginStart;
  serverless?: ServerlessPluginStart;
  cloud?: CloudStart;
  cloudConnect?: CloudConnectedPluginStart;
}

export interface AppPluginSetupDependencies {
  actions: ActionsPublicPluginSetup;
  cloud?: CloudSetup;
  console?: ConsolePluginSetup;
  features: FeaturesPluginSetup;
  licensing: LicensingPluginSetup;
  management: ManagementSetup;
  ml: MlPluginSetup;
  share: SharePluginSetup;
  serverless?: ServerlessPluginSetup;
}

export type AppServicesContext = CoreStart & AppPluginStartDependencies;

export interface InferenceUsageResponse {
  acknowledge: boolean;
  error_message: string;
  indexes: string[];
  pipelines: string[];
}

export enum GroupByOptions {
  None = 'none',
  Model = 'model_id',
  Service = 'service',
}

export type GroupByViewOptions = GroupByOptions.Model | GroupByOptions.Service;

export interface FilterOptions {
  provider: ServiceProviderKeys[];
  type: InferenceTaskType[];
}

export interface GroupedInferenceEndpointsData {
  groupId: string;
  groupLabel: string;
  endpoints: InferenceAPIConfigResponse[];
}

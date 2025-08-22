/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type {
  EncryptedSavedObjectsPluginSetup,
  EncryptedSavedObjectsPluginStart,
} from '@kbn/encrypted-saved-objects-plugin/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { LicensingPluginSetup, LicensingPluginStart } from '@kbn/licensing-plugin/server';
import type { SpacesPluginStart, SpacesPluginSetup } from '@kbn/spaces-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import type { IEventLogClientService, IEventLogService } from '@kbn/event-log-plugin/server';
import type { MonitoringCollectionSetup } from '@kbn/monitoring-collection-plugin/server';

import type { ServerlessPluginSetup, ServerlessPluginStart } from '@kbn/serverless/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { LicenseType } from '@kbn/licensing-types';
import type {
  KibanaRequest,
  SavedObjectsClientContract,
  SavedObjectAttributes,
  ElasticsearchClient,
  CustomRequestHandlerContext,
  Logger,
  ISavedObjectsRepository,
  IScopedClusterClient,
  CoreSetup,
  CoreStart,
} from '@kbn/core/server';
import type { AnySchema } from 'joi';
import type { EnabledConnectorTypes } from './config';

import type { ActionsAuthorization } from './authorization/actions_authorization';
import type {
  ICaseServiceAbstract,
  IServiceAbstract,
  SubActionConnectorType,
} from './sub_action_framework/types';

import type { IUnsecuredActionsClient } from './unsecured_actions_client/unsecured_actions_client';

import type { SubActionConnector } from './sub_action_framework/sub_action_connector';
import type { ServiceParams } from './sub_action_framework/types';
import type { ActionTypeRegistry } from './action_type_registry';
import type { ActionsClient } from './actions_client';
import type { ActionTypeExecutorResult, SubFeature } from '../common';
import type { TaskInfo } from './lib/action_executor';
import type { ConnectorTokenClient } from './lib/connector_token_client';
import type { ActionsConfigurationUtilities } from './actions_config';

export type { ActionTypeExecutorResult, ActionTypeExecutorRawResult } from '../common';
export type WithoutQueryAndParams<T> = Pick<T, Exclude<keyof T, 'query' | 'params'>>;
export type GetServicesFunction = (request: KibanaRequest) => Services;
export type GetUnsecuredServicesFunction = () => UnsecuredServices;
export type ActionTypeRegistryContract = PublicMethodsOf<ActionTypeRegistry>;
export type SpaceIdToNamespaceFunction = (spaceId?: string) => string | undefined;
export type ActionTypeConfig = Record<string, unknown>;
export type ActionTypeSecrets = Record<string, unknown>;
export type ActionTypeParams = Record<string, unknown>;
export type ConnectorTokenClientContract = PublicMethodsOf<ConnectorTokenClient>;

import type { Connector, ConnectorWithExtraFindData } from './application/connector/types';
import type { ActionExecutionSource, ActionExecutionSourceType } from './lib';
export { ActionExecutionSourceType } from './lib';
import type { ConnectorUsageCollector } from './usage';
export { ConnectorUsageCollector } from './usage';

export interface Services {
  savedObjectsClient: SavedObjectsClientContract;
  scopedClusterClient: ElasticsearchClient;
  connectorTokenClient: ConnectorTokenClient;
}

export interface UnsecuredServices {
  savedObjectsClient: ISavedObjectsRepository;
  scopedClusterClient: ElasticsearchClient;
  connectorTokenClient: ConnectorTokenClient;
}

export interface HookServices {
  scopedClusterClient: IScopedClusterClient;
}

export interface ActionsApiRequestHandlerContext {
  getActionsClient: () => ActionsClient;
  listTypes: ActionTypeRegistry['list'];
}

export type ActionsRequestHandlerContext = CustomRequestHandlerContext<{
  actions: ActionsApiRequestHandlerContext;
}>;

export interface ActionsPlugin {
  setup: PluginSetupContract;
  start: PluginStartContract;
}

export interface ActionsPluginSetupDeps {
  core: Pick<
    CoreSetup<ActionsPluginsStart, PluginStartContract>,
    'savedObjects' | 'http' | 'analytics' | 'getStartServices'
  >;
  plugins: ActionsPluginsSetup;
}

export interface ActionsPluginStartDeps {
  core: Pick<
    CoreStart,
    'http' | 'savedObjects' | 'elasticsearch' | 'featureFlags' | 'analytics' | 'security'
  >;
  plugins: ActionsPluginsStart;
}

// the parameters passed to an action type executor function
export interface ActionTypeExecutorOptions<
  Config extends Record<string, unknown>,
  Secrets extends Record<string, unknown>,
  Params
> {
  actionId: string;
  services: Services | UnsecuredServices;
  config: Config;
  secrets: Secrets;
  params: Params;
  logger: Logger;
  taskInfo?: TaskInfo;
  configurationUtilities: ActionsConfigurationUtilities;
  source?: ActionExecutionSource<unknown>;
  request?: KibanaRequest;
  connectorUsageCollector: ConnectorUsageCollector;
}

export type ActionResult = Connector;

export interface InMemoryConnector<
  Config extends ActionTypeConfig = ActionTypeConfig,
  Secrets extends ActionTypeSecrets = ActionTypeSecrets
> extends ActionResult {
  secrets: Secrets;
  config: Config;
  exposeConfig?: boolean;
}

export type FindActionResult = ConnectorWithExtraFindData;

// signature of the action type executor function
export type ExecutorType<
  Config extends Record<string, unknown>,
  Secrets extends Record<string, unknown>,
  Params,
  ResultData
> = (
  options: ActionTypeExecutorOptions<Config, Secrets, Params>
) => Promise<ActionTypeExecutorResult<ResultData>>;

export interface ValidatorType<T> {
  schema: {
    validate(value: unknown): T;
    getSchema?: () => AnySchema;
  };
  customValidator?: (value: T, validatorServices: ValidatorServices) => void;
}

export interface ValidatorServices {
  configurationUtilities: ActionsConfigurationUtilities;
}

export interface ActionValidationService {
  isHostnameAllowed(hostname: string): boolean;

  isUriAllowed(uri: string): boolean;
}

export type RenderParameterTemplates<Params extends ActionTypeParams> = (
  logger: Logger,
  params: Params,
  variables: Record<string, unknown>,
  actionId?: string
) => Params;

export interface PreSaveConnectorHookParams<
  Config extends ActionTypeConfig = ActionTypeConfig,
  Secrets extends ActionTypeSecrets = ActionTypeSecrets
> {
  connectorId: string;
  config: Config;
  secrets: Secrets;
  logger: Logger;
  request: KibanaRequest;
  services: HookServices;
  isUpdate: boolean;
}

export interface PostSaveConnectorHookParams<
  Config extends ActionTypeConfig = ActionTypeConfig,
  Secrets extends ActionTypeSecrets = ActionTypeSecrets
> {
  connectorId: string;
  config: Config;
  secrets: Secrets;
  logger: Logger;
  request: KibanaRequest;
  services: HookServices;
  isUpdate: boolean;
  wasSuccessful: boolean;
}

export interface PostDeleteConnectorHookParams<
  Config extends ActionTypeConfig = ActionTypeConfig,
  Secrets extends ActionTypeSecrets = ActionTypeSecrets
> {
  connectorId: string;
  config: Config;
  logger: Logger;
  request: KibanaRequest;
  services: HookServices;
}

export interface ActionType<
  Config extends ActionTypeConfig = ActionTypeConfig,
  Secrets extends ActionTypeSecrets = ActionTypeSecrets,
  Params extends ActionTypeParams = ActionTypeParams,
  ExecutorResultData = void
> {
  id: string;
  name: string;
  maxAttempts?: number;
  minimumLicenseRequired: LicenseType;
  supportedFeatureIds: string[];
  validate: {
    params: ValidatorType<Params>;
    config: ValidatorType<Config>;
    secrets: ValidatorType<Secrets>;
    connector?: (config: Config, secrets: Secrets) => string | null;
  };
  isSystemActionType?: boolean;
  subFeature?: SubFeature;
  /**
   * Additional Kibana privileges to be checked by the actions framework.
   * Use it if you want to perform extra authorization checks based on a Kibana feature.
   * For example, you can define the privileges a users needs to have to execute
   * a Case or OsQuery system action.
   *
   * The list of the privileges follows the Kibana privileges format usually generated with `security.authz.actions.*.get(...)`.
   *
   * It only works with system actions and only when executing an action.
   * For all other scenarios they will be ignored
   */
  getKibanaPrivileges?: (args?: {
    params?: Params;
    source?: ActionExecutionSourceType;
  }) => string[];
  renderParameterTemplates?: RenderParameterTemplates<Params>;
  executor: ExecutorType<Config, Secrets, Params, ExecutorResultData>;
  getService?: (params: ServiceParams<Config, Secrets>) => SubActionConnector<Config, Secrets>;
  preSaveHook?: (params: PreSaveConnectorHookParams<Config, Secrets>) => Promise<void>;
  postSaveHook?: (params: PostSaveConnectorHookParams<Config, Secrets>) => Promise<void>;
  postDeleteHook?: (params: PostDeleteConnectorHookParams<Config, Secrets>) => Promise<void>;
}

export interface RawAction extends Record<string, unknown> {
  actionTypeId: string;
  name: string;
  isMissingSecrets: boolean;
  config: Record<string, unknown>;
  secrets: Record<string, unknown>;
}

export interface ActionTaskParams extends SavedObjectAttributes {
  actionId: string;
  // Saved Objects won't allow us to enforce unknown rather than any

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params: Record<string, any>;
  apiKey?: string;
  executionId?: string;
  consumer?: string;
  source?: string;
}

export interface ActionTaskExecutorParams {
  spaceId: string;
  actionTaskParamsId: string;
}

export interface ProxySettings {
  proxyUrl: string;
  proxyBypassHosts: Set<string> | undefined;
  proxyOnlyHosts: Set<string> | undefined;
  proxyHeaders?: Record<string, string>;
  proxySSLSettings: SSLSettings;
}

export interface ResponseSettings {
  maxContentLength: number;
  timeout: number;
}

export interface SSLSettings {
  verificationMode?: 'none' | 'certificate' | 'full';
  pfx?: Buffer;
  cert?: Buffer;
  key?: Buffer;
  passphrase?: string;
  ca?: Buffer;
}

export interface ConnectorToken extends SavedObjectAttributes {
  connectorId: string;
  tokenType: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  updatedAt?: string;
}

// This unallowlist should only contain connector types that require a request or API key for
// execution.
export const UNALLOWED_FOR_UNSECURE_EXECUTION_CONNECTOR_TYPE_IDS = ['.index'];

export type AwsSesConfig = {
  host: string;
  port: number;
  secure: boolean;
} | null;

export interface PluginSetupContract {
  registerType<
    Config extends ActionTypeConfig = ActionTypeConfig,
    Secrets extends ActionTypeSecrets = ActionTypeSecrets,
    Params extends ActionTypeParams = ActionTypeParams,
    ExecutorResultData = void
  >(
    actionType: ActionType<Config, Secrets, Params, ExecutorResultData>
  ): void;

  registerSubActionConnectorType<
    Config extends ActionTypeConfig = ActionTypeConfig,
    Secrets extends ActionTypeSecrets = ActionTypeSecrets
  >(
    connector: SubActionConnectorType<Config, Secrets>
  ): void;

  isPreconfiguredConnector(connectorId: string): boolean;

  getSubActionConnectorClass: <Config, Secrets>() => IServiceAbstract<Config, Secrets>;
  getCaseConnectorClass: <Config, Secrets, Incident, GetIncidentResponse>() => ICaseServiceAbstract<
    Config,
    Secrets,
    Incident,
    GetIncidentResponse
  >;
  getActionsHealth: () => { hasPermanentEncryptionKey: boolean };
  getActionsConfigurationUtilities: () => ActionsConfigurationUtilities;
  setEnabledConnectorTypes: (connectorTypes: EnabledConnectorTypes) => void;

  isActionTypeEnabled(id: string, options?: { notifyUsage: boolean }): boolean;
}

export interface PluginStartContract {
  isActionTypeEnabled(id: string, options?: { notifyUsage: boolean }): boolean;

  isActionExecutable(
    actionId: string,
    actionTypeId: string,
    options?: { notifyUsage: boolean }
  ): boolean;

  getAllTypes: ActionTypeRegistry['getAllTypes'];

  getActionsClientWithRequest(request: KibanaRequest): Promise<PublicMethodsOf<ActionsClient>>;

  getActionsAuthorizationWithRequest(request: KibanaRequest): PublicMethodsOf<ActionsAuthorization>;

  inMemoryConnectors: InMemoryConnector[];

  getUnsecuredActionsClient(): IUnsecuredActionsClient;

  renderActionParameterTemplates<Params extends ActionTypeParams = ActionTypeParams>(
    actionTypeId: string,
    actionId: string,
    params: Params,
    variables: Record<string, unknown>
  ): Params;

  isSystemActionConnector: (connectorId: string) => boolean;
}

export interface ActionsPluginsSetup {
  taskManager: TaskManagerSetupContract;
  encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
  licensing: LicensingPluginSetup;
  eventLog: IEventLogService;
  usageCollection?: UsageCollectionSetup;
  security?: SecurityPluginSetup;
  features: FeaturesPluginSetup;
  spaces?: SpacesPluginSetup;
  monitoringCollection?: MonitoringCollectionSetup;
  serverless?: ServerlessPluginSetup;
  cloud: CloudSetup;
}

export interface ActionsPluginsStart {
  encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
  taskManager: TaskManagerStartContract;
  licensing: LicensingPluginStart;
  eventLog: IEventLogClientService;
  spaces?: SpacesPluginStart;
  security?: SecurityPluginStart;
  serverless?: ServerlessPluginStart;
}

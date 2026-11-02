/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  KibanaRequest,
  Logger,
  SavedObjectsServiceStart,
  PluginInitializerContext,
  ISavedObjectsRepository,
  CoreStart,
} from '@kbn/core/server';
import type { PluginStartContract as ActionsPluginStartContract } from '@kbn/actions-plugin/server';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { IEventLogClientService, IEventLogger } from '@kbn/event-log-plugin/server';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import {
  HTTPAuthorizationHeader,
  decodeApiKeyId,
  isUiamCredential,
} from '@kbn/core-security-server';
import {
  decodeStoredApiKey,
  encodeApiKey,
  getApiKeyFromRequest,
  getApiKeyInvalidationTargets,
  invalidateApiKeysNow,
  resolveScopedApiKeys,
  reuseRequestApiKey,
  type ApiKeyInvalidationTarget,
  type ScopedCredentials,
} from '@kbn/response-ops-scoped-api-keys';
import type { SpaceId } from '@kbn/core-spaces-common';
import { ALERTING_CLONE_API_KEY_HEADER } from '../common';
import type { RuleTypeRegistry, SpaceIdToNamespaceFunction } from './types';
import { RulesClient } from './rules_client';
import type { CreateAPIKeyResult } from './rules_client/types';
import { ApiKeyType } from './task_runner/types';
import type { AlertingAuthorizationClientFactory } from './alerting_authorization_client_factory';
import type { AlertingRulesConfig } from './config';
import type { GetAlertIndicesAlias } from './lib';
import type { AlertsService } from './alerts_service/alerts_service';
import type { BackfillClient } from './backfill_client/backfill_client';
import {
  AD_HOC_RUN_SAVED_OBJECT_TYPE,
  API_KEY_PENDING_INVALIDATION_TYPE,
  GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
  RULE_SAVED_OBJECT_TYPE,
  RULE_TEMPLATE_SAVED_OBJECT_TYPE,
} from './saved_objects';
import type { ConnectorAdapterRegistry } from './connector_adapters/connector_adapter_registry';
import { type IChangeTrackingService } from './rules_client/lib/change_tracking';
import { bulkMarkApiKeysForInvalidation } from './invalidate_pending_api_keys/bulk_mark_api_keys_for_invalidation';
import {
  UIAM_LOGS_CREDENTIALS_TAGS,
  UIAM_LOGS_GRANT_TAGS,
  UIAM_LOGS_INVALIDATE_TAGS,
} from './constants';

const RULE_API_KEY = 'rule';

/** Encodes a minted key the way `bulkMarkApiKeysForInvalidation` decodes it; ES keys need only their id. */
const toQueuedApiKey = ({ apiKeyId, uiamApiKey }: ApiKeyInvalidationTarget): string =>
  uiamApiKey ? encodeApiKey(apiKeyId, uiamApiKey) : Buffer.from(apiKeyId).toString('base64');

const toCreateAPIKeyResult = (
  { es, uiam, uiamExternal }: ScopedCredentials,
  name: string
): CreateAPIKeyResult => ({
  apiKeysEnabled: true,
  ...(es ? { result: { id: es.id, name: es.name ?? name, api_key: es.secret } } : {}),
  ...(uiam
    ? {
        uiamResult: {
          name: uiam.name ?? `uiam-${name}`,
          ...(uiam.id ? { id: uiam.id } : {}),
          api_key: uiam.secret,
          ...(uiamExternal ? { external: true } : {}),
        },
      }
    : {}),
});

export interface RulesClientCreateOptions {
  /**
   * When true, clone the request's API key for each newly created rule.
   * The cloned key is independent, non-expiring, and managed by alerting
   * (invalidated on rule delete/update). Only applies to rule creation, and
   * is a no-op unless the request is API-key authenticated (nothing to clone).
   */
  cloneApiKeysOnCreate?: boolean;
}

export interface RulesClientFactoryOpts {
  logger: Logger;
  taskManager: TaskManagerStartContract;
  ruleTypeRegistry: RuleTypeRegistry;
  securityPluginSetup?: SecurityPluginSetup;
  securityPluginStart?: SecurityPluginStart;
  getSpaceId: (request: KibanaRequest) => SpaceId;
  spaceIdToNamespace: SpaceIdToNamespaceFunction;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  internalSavedObjectsRepository: ISavedObjectsRepository;
  actions: ActionsPluginStartContract;
  eventLog: IEventLogClientService;
  changeTrackingService?: IChangeTrackingService;
  kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];
  authorization: AlertingAuthorizationClientFactory;
  eventLogger?: IEventLogger;
  minimumScheduleInterval: AlertingRulesConfig['minimumScheduleInterval'];
  maxScheduledPerMinute: AlertingRulesConfig['maxScheduledPerMinute'];
  getAlertIndicesAlias: GetAlertIndicesAlias;
  alertsService: AlertsService | null;
  backfillClient: BackfillClient;
  connectorAdapterRegistry: ConnectorAdapterRegistry;
  uiSettings: CoreStart['uiSettings'];
  securityService: CoreStart['security'];
  shouldGrantUiam: boolean;
  apiKeyType: ApiKeyType;
  isServerless: boolean;
  analytics: CoreStart['analytics'];
}

export class RulesClientFactory {
  private isInitialized = false;
  private logger!: Logger;
  private taskManager!: TaskManagerStartContract;
  private ruleTypeRegistry!: RuleTypeRegistry;
  private securityPluginSetup?: SecurityPluginSetup;
  private securityPluginStart?: SecurityPluginStart;
  private getSpaceId!: (request: KibanaRequest) => SpaceId;
  private spaceIdToNamespace!: SpaceIdToNamespaceFunction;
  private encryptedSavedObjectsClient!: EncryptedSavedObjectsClient;
  private internalSavedObjectsRepository!: ISavedObjectsRepository;
  private actions!: ActionsPluginStartContract;
  private eventLog!: IEventLogClientService;
  private changeTrackingService?: IChangeTrackingService;
  private kibanaVersion!: PluginInitializerContext['env']['packageInfo']['version'];
  private authorization!: AlertingAuthorizationClientFactory;
  private eventLogger?: IEventLogger;
  private minimumScheduleInterval!: AlertingRulesConfig['minimumScheduleInterval'];
  private maxScheduledPerMinute!: AlertingRulesConfig['maxScheduledPerMinute'];
  private getAlertIndicesAlias!: GetAlertIndicesAlias;
  private alertsService!: AlertsService | null;
  private backfillClient!: BackfillClient;
  private connectorAdapterRegistry!: ConnectorAdapterRegistry;
  private uiSettings!: CoreStart['uiSettings'];
  private securityService!: CoreStart['security'];
  private shouldGrantUiam: boolean = false;
  private apiKeyType: ApiKeyType = ApiKeyType.ES;
  private isServerless: boolean = false;
  private analytics!: CoreStart['analytics'];

  public initialize(options: RulesClientFactoryOpts) {
    if (this.isInitialized) {
      throw new Error('RulesClientFactory already initialized');
    }
    this.isInitialized = true;
    this.logger = options.logger;
    this.getSpaceId = options.getSpaceId;
    this.taskManager = options.taskManager;
    this.ruleTypeRegistry = options.ruleTypeRegistry;
    this.securityPluginSetup = options.securityPluginSetup;
    this.securityPluginStart = options.securityPluginStart;
    this.spaceIdToNamespace = options.spaceIdToNamespace;
    this.encryptedSavedObjectsClient = options.encryptedSavedObjectsClient;
    this.internalSavedObjectsRepository = options.internalSavedObjectsRepository;
    this.actions = options.actions;
    this.eventLog = options.eventLog;
    this.changeTrackingService = options.changeTrackingService;
    this.kibanaVersion = options.kibanaVersion;
    this.authorization = options.authorization;
    this.eventLogger = options.eventLogger;
    this.minimumScheduleInterval = options.minimumScheduleInterval;
    this.maxScheduledPerMinute = options.maxScheduledPerMinute;
    this.getAlertIndicesAlias = options.getAlertIndicesAlias;
    this.alertsService = options.alertsService;
    this.backfillClient = options.backfillClient;
    this.connectorAdapterRegistry = options.connectorAdapterRegistry;
    this.uiSettings = options.uiSettings;
    this.securityService = options.securityService;
    this.shouldGrantUiam = options.shouldGrantUiam;
    this.apiKeyType = options.apiKeyType;
    this.isServerless = options.isServerless;
    this.analytics = options.analytics;
  }

  /**
   * Creates a RulesClient bound to the space derived from the provided request (default behavior).
   */
  public async create(
    request: KibanaRequest,
    savedObjects: SavedObjectsServiceStart,
    options?: RulesClientCreateOptions
  ): Promise<RulesClient> {
    return await this.createInternal({
      request,
      savedObjects,
      spaceId: this.getSpaceId(request),
      isExplicitSpaceOverride: false,
      options,
    });
  }

  /**
   * Creates a RulesClient bound to an explicit spaceId while preserving the original request
   * (and its auth context). This avoids forging fake requests, which can break auth under UIAM.
   */
  public async createWithSpaceId(
    request: KibanaRequest,
    savedObjects: SavedObjectsServiceStart,
    spaceId: SpaceId,
    options?: RulesClientCreateOptions
  ): Promise<RulesClient> {
    return await this.createInternal({
      request,
      savedObjects,
      spaceId,
      isExplicitSpaceOverride: true,
      options,
    });
  }

  /**
   * Grants or clones the API keys for a rule. Keys minted before a failure are queued for
   * invalidation, since nothing will reference them.
   */
  private async mintRuleApiKeys(
    request: KibanaRequest,
    name: string,
    mode: 'grant' | 'clone',
    refresh?: boolean | 'wait_for'
  ): Promise<CreateAPIKeyResult> {
    const created: ApiKeyInvalidationTarget[] = [];
    const queueCreated = () =>
      created.length > 0
        ? bulkMarkApiKeysForInvalidation(
            { apiKeys: created.map(toQueuedApiKey) },
            this.logger,
            this.internalSavedObjectsRepository
          )
        : Promise.resolve();

    let resolved;
    try {
      resolved = await resolveScopedApiKeys(
        request,
        { security: this.securityService, logger: this.logger },
        {
          names: new Map([[RULE_API_KEY, { es: name, uiam: `uiam-${name}` }]]),
          mode,
          uiamEnabled: this.shouldGrantUiam,
          // Once rules run with UIAM keys, a rule saved without one cannot search across projects.
          uiamRequired: this.apiKeyType === ApiKeyType.UIAM,
          refresh,
          metadata: { managed: true, kibana: { type: 'alerting_rule' } },
          onKeyCreated: (target) => created.push(target),
          logTags: { credentials: UIAM_LOGS_CREDENTIALS_TAGS, grant: UIAM_LOGS_GRANT_TAGS },
        }
      );
    } catch (err) {
      await queueCreated();
      throw err;
    }

    const credentials = resolved.enabled ? resolved.credentials.get(RULE_API_KEY) : undefined;
    if (!credentials) {
      await queueCreated();
      return { apiKeysEnabled: false };
    }
    return toCreateAPIKeyResult(credentials, name);
  }

  private async queueApiKeysForInvalidation(apiKeys: string[]): Promise<void> {
    await bulkMarkApiKeysForInvalidation(
      { apiKeys },
      this.logger,
      this.internalSavedObjectsRepository
    );
  }

  /**
   * Synchronously invalidates the rule's ES and/or UIAM API keys, bypassing the pending
   * invalidation queue. Keys that cannot be invalidated are queued instead; nothing is rethrown
   * so that this cannot break the surrounding rule delete operation.
   */
  private async invalidateApiKeyNow({
    ruleName,
    apiKey,
    uiamApiKey,
  }: {
    ruleName: string;
    apiKey?: string | null;
    uiamApiKey?: string | null;
  }): Promise<void> {
    const uiam = uiamApiKey ? decodeStoredApiKey(uiamApiKey) : undefined;
    if (uiam && !(uiam.secret && isUiamCredential(uiam.secret))) {
      this.logger.error(
        `Failed to synchronously invalidate UIAM API key for alerting rule : ${ruleName}: stored credential is not a UIAM API key`,
        { tags: UIAM_LOGS_INVALIDATE_TAGS }
      );
    }

    const targets = getApiKeyInvalidationTargets({
      createdByUser: false,
      esApiKeyId: apiKey ? decodeApiKeyId(apiKey) : undefined,
      uiamApiKeyId: uiam?.id,
      uiamApiKey: uiam?.secret && isUiamCredential(uiam.secret) ? uiam.secret : undefined,
    });

    const failed = await invalidateApiKeysNow(
      { security: this.securityService, logger: this.logger },
      targets,
      { logContext: `alerting rule : ${ruleName}`, logTags: UIAM_LOGS_INVALIDATE_TAGS }
    );

    const toQueue = failed.flatMap((target) => {
      const stored = target.uiamApiKey ? uiamApiKey : apiKey;
      return stored ? [stored] : [];
    });
    if (toQueue.length > 0) {
      await this.queueApiKeysForInvalidation(toQueue);
    }
  }

  private async createInternal({
    request,
    savedObjects,
    spaceId,
    isExplicitSpaceOverride,
    options,
  }: {
    request: KibanaRequest;
    savedObjects: SavedObjectsServiceStart;
    spaceId: SpaceId;
    isExplicitSpaceOverride: boolean;
    options?: RulesClientCreateOptions;
  }): Promise<RulesClient> {
    const { securityPluginSetup, securityService, securityPluginStart, actions, eventLog } = this;
    const factory = this;

    if (!this.authorization) {
      throw new Error('AlertingAuthorizationClientFactory is not defined');
    }

    const authorization = await this.authorization.createForSpace(request, spaceId);

    const unsecuredSavedObjectsClient = savedObjects
      .getScopedClient(request, {
        excludedExtensions: [SECURITY_EXTENSION_ID],
        includedHiddenTypes: [
          RULE_SAVED_OBJECT_TYPE,
          RULE_TEMPLATE_SAVED_OBJECT_TYPE,
          API_KEY_PENDING_INVALIDATION_TYPE,
          AD_HOC_RUN_SAVED_OBJECT_TYPE,
          GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
        ],
      })
      .asScopedToNamespace(spaceId);

    return new RulesClient({
      request,
      spaceId,
      kibanaVersion: this.kibanaVersion,
      logger: this.logger,
      taskManager: this.taskManager,
      ruleTypeRegistry: this.ruleTypeRegistry,
      minimumScheduleInterval: this.minimumScheduleInterval,
      maxScheduledPerMinute: this.maxScheduledPerMinute,
      unsecuredSavedObjectsClient,
      authorization,
      actionsAuthorization: actions.getActionsAuthorizationWithRequest(request),
      namespace: this.spaceIdToNamespace(spaceId),
      internalSavedObjectsRepository: this.internalSavedObjectsRepository,
      encryptedSavedObjectsClient: this.encryptedSavedObjectsClient,
      auditLogger: securityPluginSetup?.audit.asScoped(request),
      changeTrackingService: this.changeTrackingService?.asScoped(request),
      getAlertIndicesAlias: this.getAlertIndicesAlias,
      alertsService: this.alertsService,
      backfillClient: this.backfillClient,
      connectorAdapterRegistry: this.connectorAdapterRegistry,
      uiSettings: this.uiSettings,
      shouldGrantUiam: this.shouldGrantUiam,
      apiKeyType: this.apiKeyType,
      isServerless: this.isServerless,
      analytics: this.analytics,

      async getUserName() {
        const user = securityService.authc.getCurrentUser(request);
        return user?.username ?? null;
      },
      async getProfileUid() {
        const user = securityService.authc.getCurrentUser(request);
        return user?.profile_uid ?? null;
      },
      async createAPIKey(name: string, refresh?: boolean | 'wait_for') {
        if (!securityPluginStart) {
          return { apiKeysEnabled: false };
        }
        return factory.mintRuleApiKeys(request, name, 'grant', refresh);
      },
      async getActionsClient() {
        if (isExplicitSpaceOverride) {
          return actions.getActionsClientWithRequestInSpace(request, spaceId);
        }
        return actions.getActionsClientWithRequest(request);
      },
      async getEventLogClient() {
        if (isExplicitSpaceOverride) {
          return eventLog.getClientWithRequestInSpace(request, spaceId);
        }
        return eventLog.getClient(request);
      },
      eventLogger: this.eventLogger,
      isAuthenticationTypeAPIKey() {
        if (!securityPluginStart) {
          return false;
        }
        const user = securityService.authc.getCurrentUser(request);
        if (user?.authentication_type) {
          return user.authentication_type === 'api_key';
        }
        const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request);
        return authorizationHeader?.scheme.toLowerCase() === 'apikey';
      },
      getAuthenticationAPIKey(name: string) {
        if (!getApiKeyFromRequest(request)) {
          return { apiKeysEnabled: false };
        }
        const credentials = reuseRequestApiKey(
          request,
          { security: securityService, logger: factory.logger },
          { uiamEnabled: factory.shouldGrantUiam }
        );
        return toCreateAPIKeyResult(credentials, name);
      },
      // A caller running on a borrowed API key (e.g. an Agent Builder task) declares it with this
      // header so created rules are minted their own framework-managed keys instead of persisting
      // the caller's. Derived here so every client reaching this factory honors it — the alerting
      // route context, `getRulesClientWithRequest` (how Detection Engine gets its client), and
      // `getRulesClientWithRequestInSpace` alike. A fake request's key is always borrowed.
      cloneApiKeysOnCreate:
        (options?.cloneApiKeysOnCreate ??
          request.headers?.[ALERTING_CLONE_API_KEY_HEADER] === 'true') ||
        request.isFakeRequest,
      async invalidateApiKeyNow(params) {
        await factory.invalidateApiKeyNow(params);
      },
      async cloneAPIKey(name: string) {
        const cloned = await factory.mintRuleApiKeys(request, name, 'clone');
        if (!cloned.apiKeysEnabled) {
          throw new Error('API key clone returned null (security feature may be disabled)');
        }
        return cloned;
      },
      isSystemAction(actionId: string) {
        return actions.isSystemActionConnector(actionId);
      },
    });
  }
}

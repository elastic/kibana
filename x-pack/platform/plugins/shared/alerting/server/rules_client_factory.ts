/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
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
import { HTTPAuthorizationHeader } from '@kbn/core-security-server';
import type { SpaceId } from '@kbn/core-spaces-common';
import type { CreateOptions } from '@kbn/response-ops-api-keys';
import { ApiKeysClient } from '@kbn/response-ops-api-keys';
import { ALERTING_CLONE_API_KEY_HEADER } from '../common';
import type { RuleTypeRegistry, SpaceIdToNamespaceFunction } from './types';
import { RulesClient } from './rules_client';
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
import { bulkMarkApiKeysForInvalidation } from './api_keys/invalidation/bulk_mark_api_keys_for_invalidation';

const RULE_API_KEY_METADATA = { managed: true, kibana: { type: 'alerting_rule' } };

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
  private apiKeys!: ApiKeysClient;

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
    this.apiKeys = new ApiKeysClient({
      security: options.securityService,
      logger: options.logger,
      pluginTag: 'alerting',
      uiamEnabled: options.shouldGrantUiam,
    });
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
   * While rules still run with ES API keys, a failed UIAM grant is logged and the rule is saved
   * with only an ES API key. Once rules run with UIAM keys, a rule saved without one cannot search
   * across projects, so the failure fails the rule write instead.
   */
  private getKeyOptions(name: string): CreateOptions {
    return {
      name,
      metadata: RULE_API_KEY_METADATA,
      subject: `alerting rule : ${name}`,
      uiam: this.apiKeyType === ApiKeyType.UIAM ? 'required' : 'optional',
    };
  }

  /**
   * Invalidates the rule's ES and UIAM API keys right away, bypassing the pending invalidation
   * queue. Errors are logged but never rethrown, so this cannot break the rule delete. An ES key
   * that Elasticsearch doesn't find yet (e.g. a `refresh: false` grant) is queued instead.
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
    const notFound = await this.apiKeys.invalidateNow(
      { apiKey, uiamApiKey },
      { subject: `alerting rule : ${ruleName}` }
    );
    if (notFound.length > 0 && apiKey) {
      this.logger.warn(
        `Synchronous ES API key invalidation found no key for alerting rule : ${ruleName}; queueing for delayed invalidation.`
      );
      await bulkMarkApiKeysForInvalidation(
        { apiKeys: [apiKey] },
        this.logger,
        this.internalSavedObjectsRepository
      );
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
        // Granted as the Kibana system user for the caller, so the caller doesn't need API key
        // privileges.
        const keys = await factory.apiKeys.grant(request, {
          ...factory.getKeyOptions(name),
          refresh,
        });
        if (!keys) {
          return { apiKeysEnabled: false };
        }
        return {
          apiKeysEnabled: true,
          ...(keys.es ? { result: keys.es } : {}),
          ...(keys.uiam ? { uiamResult: keys.uiam } : {}),
        };
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
        const requestApiKey = factory.apiKeys.fromRequest(request);
        if (!requestApiKey) {
          return { apiKeysEnabled: false };
        }
        if (requestApiKey.type === 'invalid') {
          throw new Error(
            `Failed to parse API key credentials from authorization header for alerting rule : ${name}`
          );
        }
        if (requestApiKey.type === 'es') {
          return {
            apiKeysEnabled: true,
            result: { name, id: requestApiKey.id, api_key: requestApiKey.secret },
          };
        }

        // A UIAM key without an id is a user-created Cloud API key. It is stored on the rule as-is
        // and never invalidated by alerting: `apiKeyCreatedByUser` gates every invalidation path.
        const { id, secret, external } = requestApiKey;
        if (!this.shouldGrantUiam) {
          if (!id) {
            // A client error, not a server one: keep it a 4xx with an actionable message.
            throw Boom.badRequest(
              `Cannot use a Cloud API key to create or enable rule "${name}". ` +
                `Cloud API keys are only supported in serverless environments; ` +
                `use a project-scoped Elasticsearch API key instead.`
            );
          }
          throw new Error('UIAM API keys should only be used in serverless environments');
        }
        return {
          apiKeysEnabled: true,
          uiamResult: {
            name: `uiam-${name}`,
            ...(id ? { id } : {}),
            api_key: secret,
            ...(external ? { external: true } : {}),
          },
        };
      },
      // A caller running on a borrowed API key (e.g. an Agent Builder task) declares it with this
      // header so created rules are minted their own framework-managed keys instead of persisting
      // the caller's. Derived here so every client reaching this factory honors it — the alerting
      // route context, `getRulesClientWithRequest` (how Detection Engine gets its client), and
      // `getRulesClientWithRequestInSpace` alike. An explicit option still wins.
      cloneApiKeysOnCreate:
        options?.cloneApiKeysOnCreate ??
        request.headers?.[ALERTING_CLONE_API_KEY_HEADER] === 'true',
      async invalidateApiKeyNow(params) {
        await factory.invalidateApiKeyNow(params);
      },
      async cloneAPIKey(name: string) {
        // UIAM keys can't be cloned, so a UIAM caller gets a fresh framework-owned UIAM key.
        const keys = await factory.apiKeys.clone(request, factory.getKeyOptions(name));
        if (keys.uiam) {
          return { apiKeysEnabled: true, uiamResult: keys.uiam };
        }
        if (!keys.es) {
          throw new Error('Failed to grant UIAM API key for cloned alerting rule');
        }
        return { apiKeysEnabled: true, result: keys.es };
      },
      isSystemAction(actionId: string) {
        return actions.isSystemActionConnector(actionId);
      },
    });
  }
}

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
import type { SpaceId } from '@kbn/core-spaces-common';
import type { ApiKeysClient } from '@kbn/response-ops-api-keys';
import { CloudApiKeyNotSupportedError, queueInvalidationTargets } from '@kbn/response-ops-api-keys';
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
import { createAlertingApiKeysClient, getRuleApiKeySubject } from './api_keys/client';
import { recordCreatedKeys, toReusedAPIKeyResult } from './api_keys/create_api_key_result';
import { ruleApiKeyStorage } from './api_keys/storage';

/** A Cloud API key without UIAM is the caller's mistake, so it's a 400 with an actionable message. */
const toBadRequest = (err: unknown, ruleName: string): unknown =>
  err instanceof CloudApiKeyNotSupportedError
    ? Boom.badRequest(
        `Cannot use a Cloud API key to create or enable rule "${ruleName}". ` +
          `Cloud API keys are only supported in serverless environments; ` +
          `use a project-scoped Elasticsearch API key instead.`
      )
    : err;

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
    this.apiKeys = createAlertingApiKeysClient(options.securityService, {
      logger: options.logger,
      uiamEnabled: options.shouldGrantUiam,
      uiamRequired: options.apiKeyType === ApiKeyType.UIAM,
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
   * Synchronously invalidates the rule's ES and/or UIAM API keys, bypassing the pending
   * invalidation queue. Keys that can't be invalidated yet, such as a `refresh: false` ES grant
   * Elasticsearch doesn't find, are queued instead. Never throws, so it can't break the rule delete.
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
    const subject = getRuleApiKeySubject(ruleName);
    // Callers only pass keys alerting owns.
    const keys = ruleApiKeyStorage.read({ apiKey, uiamApiKey, apiKeyCreatedByUser: false });
    const targets = await this.apiKeys.invalidateNow(keys, { subject });
    if (targets.length === 0) {
      return;
    }
    this.logger.warn(
      `Synchronous API key invalidation did not complete for ${subject}; queueing for delayed invalidation.`
    );
    await queueInvalidationTargets(targets, {
      type: API_KEY_PENDING_INVALIDATION_TYPE,
      savedObjectsClient: this.internalSavedObjectsRepository,
      logger: this.logger,
    });
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
        const { onKeyCreated, toResult } = recordCreatedKeys();
        const keys = await factory.apiKeys.grant(request, {
          name,
          subject: getRuleApiKeySubject(name),
          refresh,
          onKeyCreated,
        });
        return toResult(keys);
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
        return factory.apiKeys.isApiKeyAuthenticated(request);
      },
      // The caller's own key is stored as-is and never invalidated by alerting:
      // `apiKeyCreatedByUser` gates every invalidation path.
      getAuthenticationAPIKey(name: string) {
        try {
          const keys = factory.apiKeys.reuse(request, { subject: getRuleApiKeySubject(name) });
          return toReusedAPIKeyResult(keys, name);
        } catch (err) {
          throw toBadRequest(err, name);
        }
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
        try {
          const { onKeyCreated, toResult } = recordCreatedKeys();
          const keys = await factory.apiKeys.clone(request, {
            name,
            subject: getRuleApiKeySubject(name),
            onKeyCreated,
          });
          return toResult(keys);
        } catch (err) {
          throw toBadRequest(err, name);
        }
      },
      isSystemAction(actionId: string) {
        return actions.isSystemActionConnector(actionId);
      },
    });
  }
}

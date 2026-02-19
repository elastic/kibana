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
import type {
  GrantAPIKeyResult,
  SecurityPluginSetup,
  SecurityPluginStart,
} from '@kbn/security-plugin/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { IEventLogClientService, IEventLogger } from '@kbn/event-log-plugin/server';
import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';
import { HTTPAuthorizationHeader, isUiamCredential } from '@kbn/core-security-server';
import type { RuleTypeRegistry, SpaceIdToNamespaceFunction } from './types';
import { RulesClient } from './rules_client';
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
export interface RulesClientFactoryOpts {
  logger: Logger;
  taskManager: TaskManagerStartContract;
  ruleTypeRegistry: RuleTypeRegistry;
  securityPluginSetup?: SecurityPluginSetup;
  securityPluginStart?: SecurityPluginStart;
  getSpaceId: (request: KibanaRequest) => string;
  spaceIdToNamespace: SpaceIdToNamespaceFunction;
  encryptedSavedObjectsClient: EncryptedSavedObjectsClient;
  internalSavedObjectsRepository: ISavedObjectsRepository;
  actions: ActionsPluginStartContract;
  eventLog: IEventLogClientService;
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
}

export class RulesClientFactory {
  private isInitialized = false;
  private logger!: Logger;
  private taskManager!: TaskManagerStartContract;
  private ruleTypeRegistry!: RuleTypeRegistry;
  private securityPluginSetup?: SecurityPluginSetup;
  private securityPluginStart?: SecurityPluginStart;
  private getSpaceId!: (request: KibanaRequest) => string;
  private spaceIdToNamespace!: SpaceIdToNamespaceFunction;
  private encryptedSavedObjectsClient!: EncryptedSavedObjectsClient;
  private internalSavedObjectsRepository!: ISavedObjectsRepository;
  private actions!: ActionsPluginStartContract;
  private eventLog!: IEventLogClientService;
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
  }

  /**
   * Creates a RulesClient bound to the space derived from the provided request (default behavior).
   */
  public async create(
    request: KibanaRequest,
    savedObjects: SavedObjectsServiceStart
  ): Promise<RulesClient> {
    return await this.createInternal({
      request,
      savedObjects,
      spaceId: this.getSpaceId(request),
      isExplicitSpaceOverride: false,
    });
  }

  /**
   * Creates a RulesClient bound to an explicit spaceId while preserving the original request
   * (and its auth context). This avoids forging fake requests, which can break auth under UIAM.
   */
  public async createWithSpaceId(
    request: KibanaRequest,
    savedObjects: SavedObjectsServiceStart,
    spaceId: string
  ): Promise<RulesClient> {
    return await this.createInternal({
      request,
      savedObjects,
      spaceId,
      isExplicitSpaceOverride: true,
    });
  }

  private async createInternal({
    request,
    savedObjects,
    spaceId,
    isExplicitSpaceOverride,
  }: {
    request: KibanaRequest;
    savedObjects: SavedObjectsServiceStart;
    spaceId: string;
    isExplicitSpaceOverride: boolean;
  }): Promise<RulesClient> {
    const { securityPluginSetup, securityService, securityPluginStart, actions, eventLog } = this;

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
      getAlertIndicesAlias: this.getAlertIndicesAlias,
      alertsService: this.alertsService,
      backfillClient: this.backfillClient,
      connectorAdapterRegistry: this.connectorAdapterRegistry,
      uiSettings: this.uiSettings,
      shouldGrantUiam: this.shouldGrantUiam,

      async getUserName() {
        const user = securityService.authc.getCurrentUser(request);
        return user?.username ?? null;
      },
      async createAPIKey(name: string) {
        if (!securityPluginStart) {
          return { apiKeysEnabled: false };
        }
        // Create an API key using the new grant API - in this case the Kibana system user is creating the
        // API key for the user, instead of having the user create it themselves, which requires api_key
        // privileges
        let createUiamApiKeyResult: GrantAPIKeyResult | null | undefined;
        const shouldCreateUiamApiKey = this.shouldGrantUiam;

        const invalidateUiamApiKey = async (id?: string) => {
          if (!id) return;
          const invalidateUiamApiKeyResult = await securityService.authc.apiKeys.uiam?.invalidate(
            request,
            { id }
          );
          if (invalidateUiamApiKeyResult && invalidateUiamApiKeyResult.error_count > 0) {
            this.logger.error(
              `Failed to invalidate UIAM API key for alerting rule : ${name}: ${invalidateUiamApiKeyResult.error_details
                ?.map((error) => error.reason)
                .join(', ')}  `
            );
          }
        };

        if (shouldCreateUiamApiKey) {
          // if this throws we return bad request where this function is called from
          createUiamApiKeyResult = await securityService.authc.apiKeys.uiam?.grant(request, {
            name: `uiam-${name}`,
          });

          if (!createUiamApiKeyResult) {
            this.logger.error(`Failed to create UIAM API key for alerting rule : ${name}`);
            return { apiKeysEnabled: false };
          }
        }

        let createEsAPIKeyResult;
        try {
          createEsAPIKeyResult = await securityService.authc.apiKeys.grantAsInternalUser(request, {
            name,
            role_descriptors: {},
            metadata: { managed: true, kibana: { type: 'alerting_rule' } },
          });
        } catch (err) {
          // if the ES API key creation failed, we need to invalidate the UIAM API key
          await invalidateUiamApiKey(createUiamApiKeyResult?.id);
          // rethrow the error to be handled by the caller
          throw err;
        }

        // if we created a UIAM API key but the ES API key creation failed, we need to invalidate the UIAM API key
        if (!createEsAPIKeyResult) {
          await invalidateUiamApiKey(createUiamApiKeyResult?.id);
          return { apiKeysEnabled: false };
        }

        return {
          apiKeysEnabled: true,
          result: createEsAPIKeyResult,
          ...(createUiamApiKeyResult ? { uiamResult: createUiamApiKeyResult } : {}),
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
        return user && user.authentication_type ? user.authentication_type === 'api_key' : false;
      },
      getAuthenticationAPIKey(name: string) {
        const authorizationHeader = HTTPAuthorizationHeader.parseFromRequest(request);
        if (authorizationHeader && authorizationHeader.credentials) {
          const [apiKeyId, apiKey] = Buffer.from(authorizationHeader.credentials, 'base64')
            .toString()
            .split(':');

          if (!apiKeyId || !apiKey) {
            throw new Error(
              `Failed to parse API key credentials from authorization header for alerting rule : ${name}`
            );
          }

          if (isUiamCredential(apiKey) && !this.shouldGrantUiam) {
            throw new Error('UIAM API keys should only be used in serverless environments');
          }

          if (isUiamCredential(apiKey)) {
            return {
              apiKeysEnabled: true,
              uiamResult: {
                name: `uiam-${name}`,
                id: apiKeyId,
                api_key: apiKey,
              },
            };
          }

          return {
            apiKeysEnabled: true,
            result: {
              name,
              id: apiKeyId,
              api_key: apiKey,
            },
          };
        }
        return { apiKeysEnabled: false };
      },
      isSystemAction(actionId: string) {
        return actions.isSystemActionConnector(actionId);
      },
    });
  }
}

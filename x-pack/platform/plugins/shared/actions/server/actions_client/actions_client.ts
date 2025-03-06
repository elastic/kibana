/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import url from 'url';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';

import { i18n } from '@kbn/i18n';
import { uniq } from 'lodash';
import {
  IScopedClusterClient,
  SavedObjectsClientContract,
  KibanaRequest,
  Logger,
} from '@kbn/core/server';
import { AuditLogger } from '@kbn/security-plugin/server';
import { IEventLogClient } from '@kbn/event-log-plugin/server';
import { KueryNode } from '@kbn/es-query';
import { Connector, ConnectorWithExtraFindData } from '../application/connector/types';
import { ConnectorType } from '../application/connector/types';
import { get } from '../application/connector/methods/get';
import { getAll, getAllSystemConnectors } from '../application/connector/methods/get_all';
import { update } from '../application/connector/methods/update';
import { listTypes } from '../application/connector/methods/list_types';
import { create } from '../application/connector/methods/create';
import { execute } from '../application/connector/methods/execute';
import {
  GetGlobalExecutionKPIParams,
  GetGlobalExecutionLogParams,
  IExecutionLogResult,
} from '../../common';
import { ActionTypeRegistry } from '../action_type_registry';
import { ActionExecutorContract, parseDate } from '../lib';
import {
  ActionResult,
  RawAction,
  InMemoryConnector,
  ActionTypeExecutorResult,
  ConnectorTokenClientContract,
  HookServices,
  ActionType,
} from '../types';
import { PreconfiguredActionDisabledModificationError } from '../lib/errors/preconfigured_action_disabled_modification';
import {
  ExecuteOptions as EnqueueExecutionOptions,
  BulkExecutionEnqueuer,
  ExecutionResponse,
} from '../create_execute_function';
import { ActionsAuthorization } from '../authorization/actions_authorization';
import { connectorAuditEvent, ConnectorAuditAction } from '../lib/audit_events';
import { ActionsConfigurationUtilities } from '../actions_config';
import {
  OAuthClientCredentialsParams,
  OAuthJwtParams,
  OAuthParams,
} from '../routes/get_oauth_access_token';
import {
  getOAuthJwtAccessToken,
  GetOAuthJwtConfig,
  GetOAuthJwtSecrets,
} from '../lib/get_oauth_jwt_access_token';
import {
  getOAuthClientCredentialsAccessToken,
  GetOAuthClientCredentialsConfig,
  GetOAuthClientCredentialsSecrets,
} from '../lib/get_oauth_client_credentials_access_token';
import {
  ACTION_FILTER,
  formatExecutionKPIResult,
  formatExecutionLogResult,
  getExecutionKPIAggregation,
  getExecutionLogAggregation,
} from '../lib/get_execution_log_aggregation';
import { connectorFromSavedObject, isConnectorDeprecated } from '../application/connector/lib';
import { ListTypesParams } from '../application/connector/methods/list_types/types';
import { ConnectorUpdateParams } from '../application/connector/methods/update/types';
import { ConnectorCreateParams } from '../application/connector/methods/create/types';
import { isPreconfigured } from '../lib/is_preconfigured';
import { isSystemAction } from '../lib/is_system_action';
import { ConnectorExecuteParams } from '../application/connector/methods/execute/types';

export interface ConstructorOptions {
  logger: Logger;
  kibanaIndices: string[];
  scopedClusterClient: IScopedClusterClient;
  actionTypeRegistry: ActionTypeRegistry;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  inMemoryConnectors: InMemoryConnector[];
  actionExecutor: ActionExecutorContract;
  bulkExecutionEnqueuer: BulkExecutionEnqueuer<ExecutionResponse>;
  request: KibanaRequest;
  authorization: ActionsAuthorization;
  auditLogger?: AuditLogger;
  usageCounter?: UsageCounter;
  connectorTokenClient: ConnectorTokenClientContract;
  getEventLogClient: () => Promise<IEventLogClient>;
}

export interface ActionsClientContext {
  logger: Logger;
  kibanaIndices: string[];
  scopedClusterClient: IScopedClusterClient;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  actionTypeRegistry: ActionTypeRegistry;
  inMemoryConnectors: InMemoryConnector[];
  actionExecutor: ActionExecutorContract;
  request: KibanaRequest;
  authorization: ActionsAuthorization;
  bulkExecutionEnqueuer: BulkExecutionEnqueuer<ExecutionResponse>;
  auditLogger?: AuditLogger;
  usageCounter?: UsageCounter;
  connectorTokenClient: ConnectorTokenClientContract;
  getEventLogClient: () => Promise<IEventLogClient>;
}

export class ActionsClient {
  private readonly context: ActionsClientContext;

  constructor({
    logger,
    actionTypeRegistry,
    kibanaIndices,
    scopedClusterClient,
    unsecuredSavedObjectsClient,
    inMemoryConnectors,
    actionExecutor,
    bulkExecutionEnqueuer,
    request,
    authorization,
    auditLogger,
    usageCounter,
    connectorTokenClient,
    getEventLogClient,
  }: ConstructorOptions) {
    this.context = {
      logger,
      actionTypeRegistry,
      unsecuredSavedObjectsClient,
      scopedClusterClient,
      kibanaIndices,
      inMemoryConnectors,
      actionExecutor,
      bulkExecutionEnqueuer,
      request,
      authorization,
      auditLogger,
      usageCounter,
      connectorTokenClient,
      getEventLogClient,
    };
  }

  /**
   * Create an action
   */
  public async create({
    action,
    options,
  }: Omit<ConnectorCreateParams, 'context'>): Promise<ActionResult> {
    return create({ context: this.context, action, options });
  }

  /**
   * Update connector
   */
  public async update({
    id,
    action,
  }: Pick<ConnectorUpdateParams, 'id' | 'action'>): Promise<Connector> {
    return update({ context: this.context, id, action });
  }

  /**
   * Get a connector
   */
  public async get({
    id,
    throwIfSystemAction = true,
  }: {
    id: string;
    throwIfSystemAction?: boolean;
  }): Promise<ActionResult> {
    return get({ context: this.context, id, throwIfSystemAction });
  }

  /**
   * Get all connectors with in-memory connectors
   */
  public async getAll({ includeSystemActions = false } = {}): Promise<
    ConnectorWithExtraFindData[]
  > {
    return getAll({ context: this.context, includeSystemActions });
  }

  /**
   * Get all system connectors
   */
  public async getAllSystemConnectors(): Promise<ConnectorWithExtraFindData[]> {
    return getAllSystemConnectors({ context: this.context });
  }

  /**
   * Get bulk actions with in-memory list
   */
  public async getBulk({
    ids,
    throwIfSystemAction = true,
  }: {
    ids: string[];
    throwIfSystemAction?: boolean;
  }): Promise<ActionResult[]> {
    try {
      await this.context.authorization.ensureAuthorized({ operation: 'get' });
    } catch (error) {
      ids.forEach((id) =>
        this.context.auditLogger?.log(
          connectorAuditEvent({
            action: ConnectorAuditAction.GET,
            savedObject: { type: 'action', id },
            error,
          })
        )
      );
      throw error;
    }

    const actionResults = new Array<ActionResult>();

    for (const actionId of ids) {
      const action = this.context.inMemoryConnectors.find(
        (inMemoryConnector) => inMemoryConnector.id === actionId
      );

      /**
       * Getting system connector is not allowed
       * if throwIfSystemAction is set to true.
       * Default behavior is to throw
       */
      if (action !== undefined && action.isSystemAction && throwIfSystemAction) {
        throw Boom.notFound(`Connector ${action.id} not found`);
      }

      if (action !== undefined) {
        actionResults.push(action);
      }
    }

    // Fetch action objects in bulk
    // Excluding in-memory actions to avoid an not found error, which is already added
    const actionSavedObjectsIds = [
      ...new Set(
        ids.filter(
          (actionId) => !actionResults.find((actionResult) => actionResult.id === actionId)
        )
      ),
    ];

    const bulkGetOpts = actionSavedObjectsIds.map((id) => ({ id, type: 'action' }));
    const bulkGetResult = await this.context.unsecuredSavedObjectsClient.bulkGet<RawAction>(
      bulkGetOpts
    );

    bulkGetResult.saved_objects.forEach(({ id, error }) => {
      if (!error && this.context.auditLogger) {
        this.context.auditLogger.log(
          connectorAuditEvent({
            action: ConnectorAuditAction.GET,
            savedObject: { type: 'action', id },
          })
        );
      }
    });

    for (const action of bulkGetResult.saved_objects) {
      if (action.error) {
        throw Boom.badRequest(
          `Failed to load action ${action.id} (${action.error.statusCode}): ${action.error.message}`
        );
      }
      actionResults.push(
        connectorFromSavedObject(action, isConnectorDeprecated(action.attributes))
      );
    }

    return actionResults;
  }

  public async getOAuthAccessToken(
    { type, options }: OAuthParams,
    configurationUtilities: ActionsConfigurationUtilities
  ) {
    // Verify that user has edit access
    await this.context.authorization.ensureAuthorized({ operation: 'update' });

    // Verify that token url is allowed by allowed hosts config
    try {
      configurationUtilities.ensureUriAllowed(options.tokenUrl);
    } catch (err) {
      throw Boom.badRequest(err.message);
    }

    // Verify that token url contains a hostname and uses https
    const parsedUrl = url.parse(
      options.tokenUrl,
      false /* parseQueryString */,
      true /* slashesDenoteHost */
    );

    if (!parsedUrl.hostname) {
      throw Boom.badRequest(`Token URL must contain hostname`);
    }

    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      throw Boom.badRequest(`Token URL must use http or https`);
    }

    let accessToken: string | null = null;
    if (type === 'jwt') {
      const tokenOpts = options as OAuthJwtParams;

      try {
        accessToken = await getOAuthJwtAccessToken({
          logger: this.context.logger,
          configurationUtilities,
          credentials: {
            config: tokenOpts.config as GetOAuthJwtConfig,
            secrets: tokenOpts.secrets as GetOAuthJwtSecrets,
          },
          tokenUrl: tokenOpts.tokenUrl,
        });

        this.context.logger.debug(
          () =>
            `Successfully retrieved access token using JWT OAuth with tokenUrl ${
              tokenOpts.tokenUrl
            } and config ${JSON.stringify(tokenOpts.config)}`
        );
      } catch (err) {
        this.context.logger.debug(
          () =>
            `Failed to retrieve access token using JWT OAuth with tokenUrl ${
              tokenOpts.tokenUrl
            } and config ${JSON.stringify(tokenOpts.config)} - ${err.message}`
        );
        throw Boom.badRequest(`Failed to retrieve access token`);
      }
    } else if (type === 'client') {
      const tokenOpts = options as OAuthClientCredentialsParams;
      try {
        accessToken = await getOAuthClientCredentialsAccessToken({
          logger: this.context.logger,
          configurationUtilities,
          credentials: {
            config: tokenOpts.config as GetOAuthClientCredentialsConfig,
            secrets: tokenOpts.secrets as GetOAuthClientCredentialsSecrets,
          },
          tokenUrl: tokenOpts.tokenUrl,
          oAuthScope: tokenOpts.scope,
        });

        this.context.logger.debug(
          () =>
            `Successfully retrieved access token using Client Credentials OAuth with tokenUrl ${
              tokenOpts.tokenUrl
            }, scope ${tokenOpts.scope} and config ${JSON.stringify(tokenOpts.config)}`
        );
      } catch (err) {
        this.context.logger.debug(
          () =>
            `Failed to retrieved access token using Client Credentials OAuth with tokenUrl ${
              tokenOpts.tokenUrl
            }, scope ${tokenOpts.scope} and config ${JSON.stringify(tokenOpts.config)} - ${
              err.message
            }`
        );
        throw Boom.badRequest(`Failed to retrieve access token`);
      }
    }

    return { accessToken };
  }

  /**
   * Delete action
   */
  public async delete({ id }: { id: string }) {
    try {
      await this.context.authorization.ensureAuthorized({ operation: 'delete' });

      const foundInMemoryConnector = this.context.inMemoryConnectors.find(
        (connector) => connector.id === id
      );

      if (foundInMemoryConnector?.isSystemAction) {
        throw Boom.badRequest(
          i18n.translate('xpack.actions.serverSideErrors.systemActionDeletionForbidden', {
            defaultMessage: 'System action {id} is not allowed to delete.',
            values: {
              id,
            },
          })
        );
      }

      if (foundInMemoryConnector?.isPreconfigured) {
        throw new PreconfiguredActionDisabledModificationError(
          i18n.translate('xpack.actions.serverSideErrors.predefinedActionDeleteDisabled', {
            defaultMessage: 'Preconfigured action {id} is not allowed to delete.',
            values: {
              id,
            },
          }),
          'delete'
        );
      }
    } catch (error) {
      this.context.auditLogger?.log(
        connectorAuditEvent({
          action: ConnectorAuditAction.DELETE,
          savedObject: { type: 'action', id },
          error,
        })
      );
      throw error;
    }

    this.context.auditLogger?.log(
      connectorAuditEvent({
        action: ConnectorAuditAction.DELETE,
        outcome: 'unknown',
        savedObject: { type: 'action', id },
      })
    );

    try {
      await this.context.connectorTokenClient.deleteConnectorTokens({ connectorId: id });
    } catch (e) {
      this.context.logger.error(
        `Failed to delete auth tokens for connector "${id}" after delete: ${e.message}`
      );
    }

    const rawAction = await this.context.unsecuredSavedObjectsClient.get<RawAction>('action', id);
    const {
      attributes: { actionTypeId, config },
    } = rawAction;

    let actionType: ActionType | undefined;
    try {
      actionType = this.context.actionTypeRegistry.get(actionTypeId);
    } catch (e) {
      this.context.logger.error(
        `Failed fetching action type from registry: ${e.message} - deletion will proceed.`
      );
    }

    const result = await this.context.unsecuredSavedObjectsClient.delete('action', id);

    const hookServices: HookServices = {
      scopedClusterClient: this.context.scopedClusterClient,
    };

    if (actionType && actionType.postDeleteHook) {
      try {
        await actionType.postDeleteHook({
          connectorId: id,
          config,
          logger: this.context.logger,
          request: this.context.request,
          services: hookServices,
        });
      } catch (error) {
        const tags = ['post-delete-hook', id];
        this.context.logger.error(
          `The post delete hook failed for for connector "${id}": ${error.message}`,
          { tags }
        );
      }
    }
    return result;
  }

  public async execute(
    connectorExecuteParams: ConnectorExecuteParams
  ): Promise<ActionTypeExecutorResult<unknown>> {
    return execute(this.context, connectorExecuteParams);
  }

  public async bulkEnqueueExecution(
    options: EnqueueExecutionOptions[]
  ): Promise<ExecutionResponse> {
    /**
     * For scheduled executions the additional authorization check
     * for system actions (kibana privileges) will be performed
     * inside the ActionExecutor at execution time
     */
    await this.context.authorization.ensureAuthorized({ operation: 'execute' });
    await Promise.all(
      uniq(options.map((o) => o.actionTypeId)).map((actionTypeId) =>
        this.context.authorization.ensureAuthorized({ operation: 'execute', actionTypeId })
      )
    );
    return this.context.bulkExecutionEnqueuer(this.context.unsecuredSavedObjectsClient, options);
  }

  public async listTypes({
    featureId,
    includeSystemActionTypes = false,
  }: ListTypesParams = {}): Promise<ConnectorType[]> {
    return listTypes(this.context, { featureId, includeSystemActionTypes });
  }

  public isActionTypeEnabled(
    actionTypeId: string,
    options: { notifyUsage: boolean } = { notifyUsage: false }
  ) {
    return this.context.actionTypeRegistry.isActionTypeEnabled(actionTypeId, options);
  }

  public isPreconfigured(connectorId: string): boolean {
    return isPreconfigured(this.context, connectorId);
  }

  public isSystemAction(connectorId: string): boolean {
    return isSystemAction(this.context, connectorId);
  }

  public async getGlobalExecutionLogWithAuth({
    dateStart,
    dateEnd,
    filter,
    page,
    perPage,
    sort,
    namespaces,
  }: GetGlobalExecutionLogParams): Promise<IExecutionLogResult> {
    this.context.logger.debug(`getGlobalExecutionLogWithAuth(): getting global execution log`);

    const authorizationTuple = {} as KueryNode;
    try {
      await this.context.authorization.ensureAuthorized({ operation: 'get' });
    } catch (error) {
      this.context.auditLogger?.log(
        connectorAuditEvent({
          action: ConnectorAuditAction.GET_GLOBAL_EXECUTION_LOG,
          error,
        })
      );
      throw error;
    }

    this.context.auditLogger?.log(
      connectorAuditEvent({
        action: ConnectorAuditAction.GET_GLOBAL_EXECUTION_LOG,
      })
    );

    const dateNow = new Date();
    const parsedDateStart = parseDate(dateStart, 'dateStart', dateNow);
    const parsedDateEnd = parseDate(dateEnd, 'dateEnd', dateNow);

    const eventLogClient = await this.context.getEventLogClient();

    try {
      const aggResult = await eventLogClient.aggregateEventsWithAuthFilter(
        'action',
        authorizationTuple,
        {
          start: parsedDateStart.toISOString(),
          end: parsedDateEnd.toISOString(),
          aggs: getExecutionLogAggregation({
            filter: filter ? `${filter} AND (${ACTION_FILTER})` : ACTION_FILTER,
            page,
            perPage,
            sort,
          }),
        },
        namespaces,
        true
      );

      return formatExecutionLogResult(aggResult);
    } catch (err) {
      this.context.logger.debug(
        `actionsClient.getGlobalExecutionLogWithAuth(): error searching global event log: ${err.message}`
      );
      throw err;
    }
  }

  public async getGlobalExecutionKpiWithAuth({
    dateStart,
    dateEnd,
    filter,
    namespaces,
  }: GetGlobalExecutionKPIParams) {
    this.context.logger.debug(`getGlobalExecutionKpiWithAuth(): getting global execution KPI`);

    const authorizationTuple = {} as KueryNode;
    try {
      await this.context.authorization.ensureAuthorized({ operation: 'get' });
    } catch (error) {
      this.context.auditLogger?.log(
        connectorAuditEvent({
          action: ConnectorAuditAction.GET_GLOBAL_EXECUTION_KPI,
          error,
        })
      );
      throw error;
    }

    this.context.auditLogger?.log(
      connectorAuditEvent({
        action: ConnectorAuditAction.GET_GLOBAL_EXECUTION_KPI,
      })
    );

    const dateNow = new Date();
    const parsedDateStart = parseDate(dateStart, 'dateStart', dateNow);
    const parsedDateEnd = parseDate(dateEnd, 'dateEnd', dateNow);

    const eventLogClient = await this.context.getEventLogClient();

    try {
      const aggResult = await eventLogClient.aggregateEventsWithAuthFilter(
        'action',
        authorizationTuple,
        {
          start: parsedDateStart.toISOString(),
          end: parsedDateEnd.toISOString(),
          aggs: getExecutionKPIAggregation(
            filter ? `${filter} AND (${ACTION_FILTER})` : ACTION_FILTER
          ),
        },
        namespaces,
        true
      );

      return formatExecutionKPIResult(aggResult);
    } catch (err) {
      this.context.logger.debug(
        `actionsClient.getGlobalExecutionKpiWithAuth(): error searching global execution KPI: ${err.message}`
      );
      throw err;
    }
  }
}

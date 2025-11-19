/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceParams } from '@kbn/actions-plugin/server';
import { SubActionConnector } from '@kbn/actions-plugin/server';

import type { AxiosError } from 'axios';
import type { SubActionRequestParams } from '@kbn/actions-plugin/server/sub_action_framework/types';
import type { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import type {
  CrowdstrikeConfig,
  CrowdstrikeSecrets,
  CrowdstrikeGetAgentsResponse,
  CrowdstrikeGetAgentsParams,
  CrowdstrikeHostActionsParams,
  CrowdstrikeGetAgentOnlineStatusResponse,
  RelaxedCrowdstrikeBaseApiResponse,
  CrowdStrikeExecuteRTRResponse,
  CrowdstrikeGetScriptsResponse,
} from '@kbn/connector-schemas/crowdstrike';
import {
  SUB_ACTION,
  CrowdstrikeGetScriptsResponseSchema,
  CrowdstrikeHostActionsParamsSchema,
  CrowdstrikeGetAgentsParamsSchema,
  CrowdstrikeHostActionsResponseSchema,
  RelaxedCrowdstrikeBaseApiResponseSchema,
  CrowdstrikeRTRCommandParamsSchema,
  CrowdstrikeExecuteRTRResponseSchema,
  CrowdstrikeApiDoNotValidateResponsesSchema,
} from '@kbn/connector-schemas/crowdstrike';
import { CrowdStrikeSessionManager } from './rtr_session_manager';
import { CrowdStrikeTokenManager } from './token_manager';
import type { ExperimentalFeatures } from '../../../common/experimental_features';
import type { NodeSystemError } from './types';
import { isAggregateError } from './types';
import { CrowdstrikeError } from './error';

const SUPPORTED_RTR_COMMANDS = ['runscript'];

const paramsSerializer = (params: Record<string, string>) => {
  return Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
};

/**
 * Crowdstrike Connector
 * Uses instance-based token management with persistent storage via ConnectorTokenClient.
 * Each connector instance manages its own OAuth2 tokens with automatic refresh and caching.
 */

export class CrowdstrikeConnector extends SubActionConnector<
  CrowdstrikeConfig,
  CrowdstrikeSecrets
> {
  private tokenManager: CrowdStrikeTokenManager;
  private experimentalFeatures: ExperimentalFeatures;
  private crowdStrikeSessionManager: CrowdStrikeSessionManager;
  private urls: {
    getToken: string;
    agents: string;
    hostAction: string;
    agentStatus: string;
    batchInitRTRSession: string;
    batchRefreshRTRSession: string;
    batchExecuteRTR: string;
    batchActiveResponderExecuteRTR: string;
    batchAdminExecuteRTR: string;
    getRTRCloudScripts: string;
  };

  constructor(
    params: ServiceParams<CrowdstrikeConfig, CrowdstrikeSecrets>,
    experimentalFeatures: ExperimentalFeatures
  ) {
    super(params);
    this.experimentalFeatures = experimentalFeatures;
    this.urls = {
      getToken: `${this.config.url}/oauth2/token`,
      hostAction: `${this.config.url}/devices/entities/devices-actions/v2`,
      agents: `${this.config.url}/devices/entities/devices/v2`,
      agentStatus: `${this.config.url}/devices/entities/online-state/v1`,
      batchInitRTRSession: `${this.config.url}/real-time-response/combined/batch-init-session/v1`,
      batchRefreshRTRSession: `${this.config.url}/real-time-response/combined/batch-refresh-session/v1`,
      batchExecuteRTR: `${this.config.url}/real-time-response/combined/batch-command/v1`,
      batchActiveResponderExecuteRTR: `${this.config.url}/real-time-response/combined/batch-active-responder-command/v1`,
      batchAdminExecuteRTR: `${this.config.url}/real-time-response/combined/batch-admin-command/v1`,
      getRTRCloudScripts: `${this.config.url}/real-time-response/entities/scripts/v1`,
    };

    // Initialize token manager
    this.tokenManager = new CrowdStrikeTokenManager({
      ...params,
      apiRequest: (req, connectorUsageCollector) => this.request(req, connectorUsageCollector),
    });

    this.crowdStrikeSessionManager = new CrowdStrikeSessionManager(
      {
        batchInitRTRSession: this.urls.batchInitRTRSession,
        batchRefreshRTRSession: this.urls.batchRefreshRTRSession,
      },
      this.crowdstrikeApiRequest,
      this.logger
    );
    this.registerSubActions();
  }

  private registerSubActions() {
    this.registerSubAction({
      name: SUB_ACTION.GET_AGENT_DETAILS,
      method: 'getAgentDetails',
      schema: CrowdstrikeGetAgentsParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.HOST_ACTIONS,
      method: 'executeHostActions',
      schema: CrowdstrikeHostActionsParamsSchema,
    });

    this.registerSubAction({
      name: SUB_ACTION.GET_AGENT_ONLINE_STATUS,
      method: 'getAgentOnlineStatus',
      schema: CrowdstrikeGetAgentsParamsSchema,
    });

    if (this.experimentalFeatures.crowdstrikeConnectorRTROn) {
      this.registerSubAction({
        name: SUB_ACTION.EXECUTE_RTR_COMMAND,
        method: 'executeRTRCommand',
        schema: CrowdstrikeRTRCommandParamsSchema, // Define a proper schema for the command
      });
      this.registerSubAction({
        name: SUB_ACTION.EXECUTE_ACTIVE_RESPONDER_RTR,
        method: 'batchActiveResponderExecuteRTR',
        schema: CrowdstrikeRTRCommandParamsSchema, // Define a proper schema for the command
      });
      this.registerSubAction({
        name: SUB_ACTION.EXECUTE_ADMIN_RTR,
        method: 'batchAdminExecuteRTR',
        schema: CrowdstrikeRTRCommandParamsSchema, // Define a proper schema for the command
      });
      this.registerSubAction({
        name: SUB_ACTION.GET_RTR_CLOUD_SCRIPTS,
        method: 'getRTRCloudScripts',
        schema: CrowdstrikeRTRCommandParamsSchema, // Empty schema - this request do not have any parameters
      });
    }
  }

  public async executeHostActions(
    { alertIds, ...payload }: CrowdstrikeHostActionsParams,
    connectorUsageCollector: ConnectorUsageCollector
  ) {
    return this.crowdstrikeApiRequest(
      {
        url: this.urls.hostAction,
        method: 'post',
        params: {
          action_name: payload.command,
        },
        data: {
          ids: payload.ids,
          ...(payload.actionParameters
            ? {
                action_parameters: Object.entries(payload.actionParameters).map(
                  ([name, value]) => ({
                    name,
                    value,
                  })
                ),
              }
            : {}),
        },
        paramsSerializer,
        responseSchema: CrowdstrikeHostActionsResponseSchema,
      },
      connectorUsageCollector
    );
  }

  public async getAgentDetails(
    payload: CrowdstrikeGetAgentsParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<CrowdstrikeGetAgentsResponse> {
    return this.crowdstrikeApiRequest(
      {
        url: this.urls.agents,
        method: 'GET',
        params: {
          ids: payload.ids,
        },
        paramsSerializer,
        responseSchema: RelaxedCrowdstrikeBaseApiResponseSchema,
      },
      connectorUsageCollector
    ) as Promise<CrowdstrikeGetAgentsResponse>;
  }

  public async getAgentOnlineStatus(
    payload: CrowdstrikeGetAgentsParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<CrowdstrikeGetAgentOnlineStatusResponse> {
    return this.crowdstrikeApiRequest(
      {
        url: this.urls.agentStatus,
        method: 'GET',
        params: {
          ids: payload.ids,
        },
        paramsSerializer,
        responseSchema: RelaxedCrowdstrikeBaseApiResponseSchema,
      },
      connectorUsageCollector
    ) as Promise<CrowdstrikeGetAgentOnlineStatusResponse>;
  }

  private crowdstrikeApiRequest = async <R extends RelaxedCrowdstrikeBaseApiResponse>(
    req: SubActionRequestParams<R>,
    connectorUsageCollector: ConnectorUsageCollector,
    retried?: boolean
  ): Promise<R> => {
    this.logger.debug('Making CrowdStrike API request', {
      url: {
        full: req.url,
      },
      method: req.method,
      retried: retried || false,
    });

    try {
      this.logger.debug('Getting authentication token');
      const token = await this.tokenManager.get(connectorUsageCollector);

      const response = await this.request<R>(
        {
          ...req,
          // We don't validate responses from Crowdstrike API's because we do not want failures for cases
          // where the external system might add/remove/change values in the response that we have no
          // control over.
          responseSchema:
            CrowdstrikeApiDoNotValidateResponsesSchema as unknown as SubActionRequestParams<R>['responseSchema'],
          headers: {
            ...req.headers,
            Authorization: `Bearer ${token}`,
          },
        },
        connectorUsageCollector
      );

      this.logger.debug('CrowdStrike API request successful', {
        url: {
          full: req.url,
        },
        status: response.status,
      });

      return response.data;
    } catch (error) {
      this.logger.debug('CrowdStrike API request error', {
        url: {
          full: req.url,
        },
        code: error.code,
        status: error.response?.status,
        message: error.message,
        retried: retried || false,
      });

      if (error.code === 401 && !retried) {
        this.logger.debug('401 error, triggering token refresh and retry');
        await this.tokenManager.generateNew(connectorUsageCollector);
        return this.crowdstrikeApiRequest(req, connectorUsageCollector, true);
      }
      throw new CrowdstrikeError(error.message);
    }
  };

  // Helper method to execute RTR commands with different API endpoints
  private executeRTRCommandWithUrl = async (
    url: string,
    payload: {
      command: string;
      endpoint_ids: string[];
    },
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<CrowdStrikeExecuteRTRResponse> => {
    this.logger.debug('Executing RTR command', {
      url: {
        full: url,
      },
      command: payload.command,
      endpointIds: payload.endpoint_ids,
    });

    this.logger.debug('Initializing RTR session');
    const batchId = await this.crowdStrikeSessionManager.initializeSession(
      { endpoint_ids: payload.endpoint_ids },
      connectorUsageCollector
    );

    this.logger.debug(`RTR session initialized with batchId: ${batchId}`);

    const baseCommand = payload.command.split(' ')[0];

    if (!SUPPORTED_RTR_COMMANDS.includes(baseCommand)) {
      throw new CrowdstrikeError('Command not supported');
    }
    return await this.crowdstrikeApiRequest<CrowdStrikeExecuteRTRResponse>(
      {
        url,
        method: 'post',
        data: {
          base_command: baseCommand,
          command_string: payload.command,
          batch_id: batchId,
          hosts: payload.endpoint_ids,
          persist_all: false,
        },
        paramsSerializer,
        responseSchema:
          CrowdstrikeExecuteRTRResponseSchema as unknown as SubActionRequestParams<CrowdStrikeExecuteRTRResponse>['responseSchema'],
      },
      connectorUsageCollector
    );
  };

  // Public method for generic RTR command execution
  public async executeRTRCommand(
    payload: {
      command: string;
      endpoint_ids: string[];
    },
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<CrowdStrikeExecuteRTRResponse> {
    return await this.executeRTRCommandWithUrl(
      this.urls.batchExecuteRTR,
      payload,
      connectorUsageCollector
    );
  }

  // Public method for Active Responder RTR command execution
  public async batchActiveResponderExecuteRTR(
    payload: {
      command: string;
      endpoint_ids: string[];
    },
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<CrowdStrikeExecuteRTRResponse> {
    return await this.executeRTRCommandWithUrl(
      this.urls.batchActiveResponderExecuteRTR,
      payload,
      connectorUsageCollector
    );
  }

  // Public method for Admin RTR command execution
  public async batchAdminExecuteRTR(
    payload: {
      command: string;
      endpoint_ids: string[];
    },
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<CrowdStrikeExecuteRTRResponse> {
    return await this.executeRTRCommandWithUrl(
      this.urls.batchAdminExecuteRTR,
      payload,
      connectorUsageCollector
    );
  }

  public async getRTRCloudScripts(
    _payload: {},
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<CrowdstrikeGetScriptsResponse> {
    return await this.crowdstrikeApiRequest(
      {
        url: this.urls.getRTRCloudScripts,
        method: 'GET',
        paramsSerializer,
        responseSchema: CrowdstrikeGetScriptsResponseSchema,
      },
      connectorUsageCollector
    );
  }

  protected getResponseErrorMessage(
    error: AxiosError<{ errors: Array<{ message: string; code: number }> }>
  ): string {
    const errorData = error.response?.data?.errors?.[0];
    if (errorData) {
      return errorData.message;
    }

    const cause: NodeSystemError = isAggregateError(error.cause)
      ? error.cause.errors[0]
      : error.cause;
    if (cause) {
      // ENOTFOUND is the error code for when the host is unreachable eg. api.crowdstrike.com111
      if (cause.code === 'ENOTFOUND') {
        return `URL not found: ${cause.hostname}`;
      }
      // ECONNREFUSED is the error code for when the host is unreachable eg. http://MacBook-Pro-Tomasz.local:55555
      if (cause.code === 'ECONNREFUSED') {
        return `Connection Refused: ${cause.address}:${cause.port}`;
      }
    }

    if (!error.response?.status) {
      return `Unknown API Error: ${JSON.stringify(error.response?.data ?? {})}`;
    }

    return `API Error: ${JSON.stringify(error.response.data ?? {})}`;
  }
}

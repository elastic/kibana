/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import https from 'https';

import type { ElasticsearchClient, LogMeta, SavedObjectsClientContract } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { SslConfig, sslSchema } from '@kbn/server-http-tools';

import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';

import apm from 'elastic-apm-node';

import { AgentlessAgentCreateOverProvisionedError } from '../../../common/errors';
import { SO_SEARCH_LIMIT } from '../../constants';
import type { AgentPolicy } from '../../types';
import type { AgentlessApiDeploymentResponse, FleetServerHost } from '../../../common/types';
import {
  AgentlessAgentConfigError,
  AgentlessAgentCreateError,
  AgentlessAgentDeleteError,
  AgentlessAgentUpgradeError,
} from '../../errors';
import {
  AGENTLESS_GLOBAL_TAG_NAME_ORGANIZATION,
  AGENTLESS_GLOBAL_TAG_NAME_DIVISION,
  AGENTLESS_GLOBAL_TAG_NAME_TEAM,
} from '../../constants';

import { appContextService } from '../app_context';

import { listEnrollmentApiKeys } from '../api_keys';
import { fleetServerHostService } from '../fleet_server_host';
import type { AgentlessConfig } from '../utils/agentless';
import { prependAgentlessApiBasePathToEndpoint, isAgentlessEnabled } from '../utils/agentless';
import {
  AGENTLESS_API_ERROR_CODES,
  MAXIMUM_RETRIES,
  RETRYABLE_HTTP_STATUSES,
  RETRYABLE_SERVER_CODES,
} from '../../../common/constants/agentless';
import { agentPolicyService } from '../agent_policy';

interface AgentlessAgentErrorHandlingMessages {
  [key: string]: {
    [key: string]: {
      log: string;
      message: string;
    };
  };
}

class AgentlessAgentService {
  public async createAgentlessAgent(
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract,
    agentlessAgentPolicy: AgentPolicy
  ) {
    const traceId = apm.currentTransaction?.traceparent;
    const errorMetadata: LogMeta = {
      trace: {
        id: traceId,
      },
    };

    const logger = appContextService.getLogger();
    logger.debug(`[Agentless API] Creating agentless agent ${agentlessAgentPolicy.id}`);

    const agentlessConfig = appContextService.getConfig()?.agentless;
    if (!agentlessConfig) {
      logger.error('[Agentless API] Missing agentless configuration', errorMetadata);
      throw new AgentlessAgentConfigError('missing Agentless API configuration in Kibana');
    }

    if (!isAgentlessEnabled()) {
      logger.error(
        '[Agentless API] Agentless agents are only supported in cloud deployment and serverless projects'
      );
      throw new AgentlessAgentConfigError(
        'Agentless agents are only supported in cloud deployment and serverless projects'
      );
    }
    if (!agentlessAgentPolicy.supports_agentless) {
      logger.error('[Agentless API] Agentless agent policy does not have agentless enabled');
      throw new AgentlessAgentConfigError(
        'Agentless agent policy does not have supports_agentless enabled'
      );
    }

    const { fleetUrl, fleetToken } = await this.getFleetUrlAndTokenForAgentlessAgent(
      esClient,
      agentlessAgentPolicy,
      soClient
    );

    logger.debug(
      `[Agentless API] Creating agentless agent with fleetUrl ${fleetUrl} and fleet_token: [REDACTED]`
    );

    if (agentlessAgentPolicy.agentless?.cloud_connectors?.enabled) {
      logger.debug(
        `[Agentless API] Creating agentless agent with ${agentlessAgentPolicy.agentless?.cloud_connectors?.target_csp} cloud connector enabled for agentless policy ${agentlessAgentPolicy.id}`
      );
    }

    logger.debug(
      `[Agentless API] Creating agentless agent with TLS cert: ${
        agentlessConfig?.api?.tls?.certificate ? '[REDACTED]' : 'undefined'
      } and TLS key: ${agentlessConfig?.api?.tls?.key ? '[REDACTED]' : 'undefined'}
      and TLS ca: ${agentlessConfig?.api?.tls?.ca ? '[REDACTED]' : 'undefined'}`
    );
    const tlsConfig = this.createTlsConfig(agentlessConfig);
    const labels = this.getAgentlessTags(agentlessAgentPolicy);
    const secrets = this.getAgentlessSecrets();
    const policyDetails = await this.getPolicyDetails(soClient, agentlessAgentPolicy);

    const requestConfig: AxiosRequestConfig = {
      url: prependAgentlessApiBasePathToEndpoint(agentlessConfig, '/deployments'),
      data: {
        policy_id: agentlessAgentPolicy.id,
        fleet_url: fleetUrl,
        fleet_token: fleetToken,
        resources: agentlessAgentPolicy.agentless?.resources,
        cloud_connectors: agentlessAgentPolicy.agentless?.cloud_connectors,
        labels,
        secrets,
        policy_details: policyDetails,
      },
      method: 'POST',
      ...this.getHeaders(tlsConfig, traceId),
    };

    const cloudSetup = appContextService.getCloud();
    if (!cloudSetup?.isServerlessEnabled) {
      requestConfig.data.stack_version = appContextService.getKibanaVersion();
    }

    const requestConfigDebugStatus = this.createRequestConfigDebug(requestConfig);

    logger.debug(
      `[Agentless API] Creating agentless agent with request config ${requestConfigDebugStatus}`
    );

    const response = await axios<AgentlessApiDeploymentResponse>(requestConfig).catch(
      (error: Error | AxiosError) => {
        this.catchAgentlessApiError(
          'create',
          error,
          logger,
          agentlessAgentPolicy.id,
          requestConfig,
          requestConfigDebugStatus,
          errorMetadata,
          traceId
        );
      }
    );

    logger.debug(`[Agentless API] Created an agentless agent ${response}`);
    return response;
  }

  public async deleteAgentlessAgent(agentlessPolicyId: string) {
    const logger = appContextService.getLogger();
    const traceId = apm.currentTransaction?.traceparent;
    const agentlessConfig = appContextService.getConfig()?.agentless;
    const tlsConfig = this.createTlsConfig(agentlessConfig);
    const requestConfig = {
      url: prependAgentlessApiBasePathToEndpoint(
        agentlessConfig,
        `/deployments/${agentlessPolicyId}`
      ),
      method: 'DELETE',
      ...this.getHeaders(tlsConfig, traceId),
    };

    const errorMetadata: LogMeta = {
      trace: {
        id: traceId,
      },
    };

    const requestConfigDebugStatus = this.createRequestConfigDebug(requestConfig);

    logger.debug(
      `[Agentless API] Start deleting agentless agent for agent policy ${requestConfigDebugStatus}`
    );

    if (!isAgentlessEnabled) {
      logger.error(
        '[Agentless API] Agentless API is not supported. Deleting agentless agent is not supported in non-cloud or non-serverless environments'
      );
    }

    if (!agentlessConfig) {
      logger.error('[Agentless API] kibana.yml is currently missing Agentless API configuration');
    }

    logger.debug(`[Agentless API] Deleting agentless agent with TLS config with certificate`);

    logger.debug(
      `[Agentless API] Deleting agentless deployment with request config ${requestConfigDebugStatus}`
    );

    const response = await axios(requestConfig).catch((error: AxiosError) => {
      this.catchAgentlessApiError(
        'delete',
        error,
        logger,
        agentlessPolicyId,
        requestConfig,
        requestConfigDebugStatus,
        errorMetadata,
        traceId
      );
    });

    return response;
  }

  public async upgradeAgentlessDeployment(policyId: string) {
    const logger = appContextService.getLogger();
    const traceId = apm.currentTransaction?.traceparent;
    const agentlessConfig = appContextService.getConfig()?.agentless;
    const kibanaVersion = appContextService.getKibanaVersion();
    const tlsConfig = this.createTlsConfig(agentlessConfig);
    const urlEndpoint = prependAgentlessApiBasePathToEndpoint(
      agentlessConfig,
      `/deployments/${policyId}`
    ).split('/api')[1];
    logger.info(
      `[Agentless API] Call Agentless API endpoint ${urlEndpoint} to upgrade agentless deployment`
    );
    const requestConfig = {
      url: prependAgentlessApiBasePathToEndpoint(agentlessConfig, `/deployments/${policyId}`),
      method: 'PUT',
      data: {
        stack_version: kibanaVersion,
      },
      ...this.getHeaders(tlsConfig, traceId),
    };

    const errorMetadata: LogMeta = {
      trace: {
        id: traceId,
      },
    };

    const requestConfigDebugStatus = this.createRequestConfigDebug(requestConfig);

    logger.info(
      `[Agentless API] Start upgrading agentless deployment for agent policy ${requestConfigDebugStatus}`
    );

    if (!isAgentlessEnabled) {
      logger.error(
        '[Agentless API] Agentless API is not supported. Upgrading agentless agent is not supported in non-cloud'
      );
    }

    if (!agentlessConfig) {
      logger.error('[Agentless API] kibana.yml is currently missing Agentless API configuration');
    }

    logger.info(`[Agentless API] Upgrading agentless agent with TLS config with certificate`);

    logger.info(
      `[Agentless API] Upgrade agentless deployment with request config ${requestConfigDebugStatus}`
    );

    const response = await axios(requestConfig).catch(async (error: AxiosError) => {
      await this.handleErrorsWithRetries(
        error,
        requestConfig,
        'upgrade',
        logger,
        MAXIMUM_RETRIES,
        policyId,
        requestConfigDebugStatus,
        errorMetadata,
        traceId
      );
    });

    return response;
  }

  private getAgentlessSecrets() {
    const deploymentSecrets = appContextService.getConfig()?.agentless?.deploymentSecrets;

    if (!deploymentSecrets) return {};

    return {
      ...(deploymentSecrets?.fleetAppToken
        ? { fleet_app_token: deploymentSecrets?.fleetAppToken }
        : {}),
      ...(deploymentSecrets?.elasticsearchAppToken
        ? { elasticsearch_app_token: deploymentSecrets?.elasticsearchAppToken }
        : {}),
    };
  }

  private getHeaders(tlsConfig: SslConfig, traceId: string | undefined) {
    return {
      headers: {
        'Content-type': 'application/json',
        'X-Request-ID': traceId,
        'x-elastic-internal-origin': 'Kibana',
      },
      httpsAgent: new https.Agent({
        rejectUnauthorized: tlsConfig.rejectUnauthorized,
        cert: tlsConfig.certificate,
        key: tlsConfig.key,
        ca: tlsConfig.certificateAuthorities,
      }),
    };
  }

  private async getPolicyDetails(
    soClient: SavedObjectsClientContract,
    agentlessAgentPolicy: AgentPolicy
  ) {
    const fullPolicy = await agentPolicyService.getFullAgentPolicy(
      soClient,
      agentlessAgentPolicy.id
    );

    return {
      output_name: Object.keys(fullPolicy?.outputs || {})?.[0], // Agentless policies only have one output
    };
  }

  private getAgentlessTags(agentlessAgentPolicy: AgentPolicy) {
    if (!agentlessAgentPolicy.global_data_tags) {
      return undefined;
    }

    const getGlobalTagValueByName = (name: string) =>
      agentlessAgentPolicy.global_data_tags?.find((tag) => tag.name === name)?.value;

    return {
      owner: {
        org: getGlobalTagValueByName(AGENTLESS_GLOBAL_TAG_NAME_ORGANIZATION),
        division: getGlobalTagValueByName(AGENTLESS_GLOBAL_TAG_NAME_DIVISION),
        team: getGlobalTagValueByName(AGENTLESS_GLOBAL_TAG_NAME_TEAM),
      },
    };
  }

  private withRequestIdMessage(message: string, traceId?: string) {
    return `${message} [Request Id: ${traceId}]`;
  }

  private createTlsConfig(agentlessConfig: AgentlessConfig | undefined) {
    return new SslConfig(
      sslSchema.validate({
        enabled: true,
        certificate: agentlessConfig?.api?.tls?.certificate,
        key: agentlessConfig?.api?.tls?.key,
        certificateAuthorities: agentlessConfig?.api?.tls?.ca,
      })
    );
  }

  private async getFleetUrlAndTokenForAgentlessAgent(
    esClient: ElasticsearchClient,
    policy: AgentPolicy,
    soClient: SavedObjectsClientContract
  ) {
    const { items: enrollmentApiKeys } = await listEnrollmentApiKeys(esClient, {
      perPage: SO_SEARCH_LIMIT,
      showInactive: true,
      kuery: `policy_id:"${policy.id}"`,
    });

    if (!enrollmentApiKeys.length) {
      throw new AgentlessAgentConfigError('missing Fleet enrollment token');
    }

    if (!policy.fleet_server_host_id) {
      throw new AgentlessAgentConfigError('missing fleet_server_host_id');
    }

    let defaultFleetHost: FleetServerHost;

    try {
      defaultFleetHost = await fleetServerHostService.get(soClient, policy.fleet_server_host_id);
    } catch (e) {
      throw new AgentlessAgentConfigError('missing default Fleet server host');
    }

    const fleetToken = enrollmentApiKeys[0].api_key;
    const fleetUrl = defaultFleetHost?.host_urls[0];
    return { fleetUrl, fleetToken };
  }

  private createRequestConfigDebug(requestConfig: AxiosRequestConfig<any>) {
    return JSON.stringify({
      ...requestConfig,
      data: {
        ...requestConfig.data,
        fleet_token: '[REDACTED]',
      },
      httpsAgent: {
        ...requestConfig.httpsAgent,
        options: {
          ...requestConfig.httpsAgent.options,
          cert: requestConfig.httpsAgent.options.cert ? 'REDACTED' : undefined,
          key: requestConfig.httpsAgent.options.key ? 'REDACTED' : undefined,
          ca: requestConfig.httpsAgent.options.ca ? 'REDACTED' : undefined,
        },
      },
    });
  }

  private catchAgentlessApiError(
    action: 'create' | 'delete' | 'upgrade',
    error: Error | AxiosError,
    logger: Logger,
    agentlessPolicyId: string,
    requestConfig: AxiosRequestConfig,
    requestConfigDebugStatus: string,
    errorMetadata: LogMeta,
    traceId?: string
  ) {
    const errorMetadataWithRequestConfig: LogMeta = {
      ...errorMetadata,
      http: {
        request: {
          id: traceId,
          body: requestConfig.data,
        },
      },
    };

    const errorLogCodeCause = (axiosError: AxiosError) =>
      `${axiosError.code}  ${this.convertCauseErrorsToString(axiosError)}`;

    if (!axios.isAxiosError(error)) {
      let errorLogMessage;

      if (action === 'create') {
        errorLogMessage = `[Agentless API] Creating agentless failed with an error that is not an AxiosError for agentless policy`;
      }
      if (action === 'delete') {
        errorLogMessage = `[Agentless API] Deleting agentless deployment failed with an error that is not an Axios error for agentless policy`;
      }
      if (action === 'upgrade') {
        errorLogMessage = `[Agentless API] Upgrading agentless deployment failed with an error that is not an Axios error for agentless policy`;
      }
      logger.error(
        `${errorLogMessage} ${error} ${requestConfigDebugStatus}`,
        errorMetadataWithRequestConfig
      );

      throw this.getAgentlessAgentError(action, error.message, traceId);
    }

    const ERROR_HANDLING_MESSAGES: AgentlessAgentErrorHandlingMessages =
      this.getErrorHandlingMessages(agentlessPolicyId);

    if (error.response) {
      // The request was made and the server responded with a status code and error data
      const responseErrorMessage =
        error.response.status in ERROR_HANDLING_MESSAGES
          ? ERROR_HANDLING_MESSAGES[error.response.status][action]
          : ERROR_HANDLING_MESSAGES.unhandled_response[action];

      this.handleResponseError(
        action,
        error.response,
        logger,
        errorMetadataWithRequestConfig,
        requestConfigDebugStatus,
        responseErrorMessage.log,
        responseErrorMessage.message,
        traceId
      );
    } else if (error.request) {
      // The request was made but no response was received
      const requestErrorMessage = ERROR_HANDLING_MESSAGES.request_error[action];
      logger.error(
        `${requestErrorMessage.log} ${errorLogCodeCause(error)} ${requestConfigDebugStatus}`,
        errorMetadataWithRequestConfig
      );

      throw this.getAgentlessAgentError(action, requestErrorMessage.message, traceId);
    } else {
      // Something happened in setting up the request that triggered an Error
      logger.error(
        `[Agentless API] ${action + 'ing'} the agentless agent failed ${errorLogCodeCause(
          error
        )} ${requestConfigDebugStatus}`,
        errorMetadataWithRequestConfig
      );

      throw this.getAgentlessAgentError(
        action,
        `the Agentless API could not ${action} the agentless agent`,
        traceId
      );
    }
  }

  private handleResponseError(
    action: 'create' | 'delete' | 'upgrade',
    response: AxiosResponse,
    logger: Logger,
    errorMetadataWithRequestConfig: LogMeta,
    requestConfigDebugStatus: string,
    logMessage: string,
    userMessage: string,
    traceId?: string
  ) {
    logger.error(
      `${logMessage} ${JSON.stringify(response.status)} ${JSON.stringify(
        response.data
      )}} ${requestConfigDebugStatus}`,
      {
        ...errorMetadataWithRequestConfig,
        http: {
          ...errorMetadataWithRequestConfig.http,
          response: {
            status_code: response?.status,
            body: response?.data,
          },
        },
      }
    );

    const responseData = {
      code: response?.data?.code,
      error: response?.data?.error,
    };

    throw this.getAgentlessAgentError(action, userMessage, traceId, responseData);
  }

  private convertCauseErrorsToString = (error: AxiosError) => {
    if (error.cause instanceof AggregateError) {
      return error.cause.errors.map((e: Error) => e.message);
    }
    return error.cause;
  };

  private getAgentlessAgentError(
    action: string,
    userMessage: string,
    traceId: string | undefined,
    responseData?: {
      code?: string;
      error?: string;
    }
  ) {
    if (action === 'create') {
      if (responseData?.code === AGENTLESS_API_ERROR_CODES.OVER_PROVISIONED) {
        const limitMatches = responseData?.error?.match(/limit: ([0-9]+)/);
        const limit = limitMatches ? parseInt(limitMatches[1], 10) : undefined;

        return new AgentlessAgentCreateOverProvisionedError(
          this.withRequestIdMessage(userMessage, traceId),
          limit
        );
      }
      return new AgentlessAgentCreateError(this.withRequestIdMessage(userMessage, traceId));
    }
    if (action === 'delete') {
      return new AgentlessAgentDeleteError(this.withRequestIdMessage(userMessage, traceId));
    }
    if (action === 'upgrade') {
      return new AgentlessAgentUpgradeError(this.withRequestIdMessage(userMessage, traceId));
    }
  }

  private getErrorHandlingMessages(agentlessPolicyId: string): AgentlessAgentErrorHandlingMessages {
    return {
      400: {
        create: {
          log: '[Agentless API] Creating the agentless agent failed with a status 400, bad request for agentless policy.',
          message: `The Agentless API could not create the agentless agent. Please delete the agentless policy ${agentlessPolicyId} and try again or contact your administrator.`,
        },
        delete: {
          log: '[Agentless API] Deleting the agentless deployment failed with a status 400, bad request for agentless policy.',
          message: `The Agentless API could not delete the agentless deployment. Please delete the agentless policy ${agentlessPolicyId} and try again or contact your administrator.`,
        },
        upgrade: {
          log: '[Agentless API] Upgrading the agentless agent failed with a status 400, bad request for agentless policy.',
          message: `The Agentless API could not upgrade the agentless agent. Please delete the agentless policy ${agentlessPolicyId} and try again or contact your administrator.`,
        },
      },
      401: {
        create: {
          log: '[Agentless API] Creating the agentless agent failed with a status 401 unauthorized for agentless policy.',
          message: `The Agentless API could not create the agentless agent because an unauthorized request was sent. Please delete the agentless policy ${agentlessPolicyId} and try again or contact your administrator.`,
        },
        delete: {
          log: '[Agentless API] Deleting the agentless deployment failed with a status 401 unauthorized for agentless policy.',
          message: `The Agentless API could not delete the agentless deployment because an unauthorized request was sent. Please delete the agentless policy ${agentlessPolicyId} and try again or contact your administrator.`,
        },
        upgrade: {
          log: '[Agentless API] Upgrading the agentless agent failed with a status 401 unauthorized for agentless policy.',
          message: `The Agentless API could not upgrade the agentless agent because an unauthorized request was sent. Please delete the agentless policy ${agentlessPolicyId} and try again or contact your administrator.`,
        },
      },
      403: {
        create: {
          log: '[Agentless API] Creating the agentless agent failed with a status 403 forbidden for agentless policy.',
          message: `The Agentless API could not create the agentless agent because a forbidden request was sent. Please delete the agentless policy ${agentlessPolicyId} and try again or contact your administrator.`,
        },
        delete: {
          log: '[Agentless API] Deleting the agentless deployment failed with a status 403 forbidden for agentless policy.',
          message: `The Agentless API could not delete the agentless deployment because a forbidden request was sent. Please delete the agentless policy ${agentlessPolicyId} and try again or contact your administrator.`,
        },
        upgrade: {
          log: '[Agentless API] Upgrading the agentless agent failed with a status 403 forbidden for agentless policy.',
          message: `The Agentless API could not upgrade the agentless agent because a forbidden request was sent. Please delete the agentless policy ${agentlessPolicyId} and try again or contact your administrator.`,
        },
      },
      404: {
        create: {
          log: '[Agentless API] Creating the agentless agent failed with a status 404 not found.',
          message: `The Agentless API could not create the agentless agent because it returned a 404 error. Please delete the agentless policy ${agentlessPolicyId} and try again or contact your administrator.`,
        },
        delete: {
          log: '[Agentless API] Deleting the agentless deployment failed with a status 404 not found.',
          message: `The Agentless API could not delete the agentless deployment because it could not be found. Please delete the agentless policy ${agentlessPolicyId} and try again or contact your administrator.`,
        },
        upgrade: {
          log: '[Agentless API] Upgrading the agentless agent failed with a status 404 not found.',
          message: `The Agentless API could not upgrade the agentless agent because it returned a 404 error. Please delete the agentless policy ${agentlessPolicyId} and try again or contact your administrator.`,
        },
      },
      408: {
        create: {
          log: '[Agentless API] Creating the agentless agent failed with a status 408, the request timed out.',
          message: `The Agentless API request timed out. Please wait a few minutes for the agent to enroll with Fleet. If the agent fails to enroll, delete the agentless policy ${agentlessPolicyId} and try again or contact your administrator.`,
        },
        delete: {
          log: '[Agentless API] Deleting the agentless deployment failed with a status 408, the request timed out.',
          message: `The Agentless API request timed out. Please wait a few minutes for the deployment to be removed. If it persists, delete the agentless policy ${agentlessPolicyId} and try again or contact your administrator.`,
        },
        upgrade: {
          log: '[Agentless API] Upgrading the agentless agent failed with a status 408, the request timed out.',
          message: `The Agentless API request timed out during the upgrade process. Please try again later or contact your administrator.`,
        },
      },
      429: {
        create: {
          log: '[Agentless API] Creating the agentless agent failed with a status 429, agentless agent limit reached.',
          message:
            'You have reached the limit for agentless provisioning. Please remove some or switch to agent-based integration.',
        },
        upgrade: {
          log: '[Agentless API] Upgrading the agentless agent failed with a status 429, agentless agent limit reached.',
          message:
            'You have reached the limit for agentless provisioning. Please remove some or switch to agent-based integration.',
        },
      },
      500: {
        create: {
          log: '[Agentless API] Creating the agentless agent failed with a status 500 internal service error.',
          message: `The Agentless API could not create the agentless agent because it returned a 500 error. Please delete the agentless policy ${agentlessPolicyId} and try again or contact your administrator.`,
        },
        delete: {
          log: '[Agentless API] Deleting the agentless deployment failed with a status 500 internal service error.',
          message: `The Agentless API could not delete the agentless deployment because it returned a 500 error. Please delete the agentless policy ${agentlessPolicyId} and try again or contact your administrator.`,
        },
        upgrade: {
          log: '[Agentless API] Upgrading the agentless agent failed with a status 500 internal service error.',
          message: `The Agentless API could not upgrade the agentless agent because it returned a 500 error. Please delete the agentless policy ${agentlessPolicyId} and try again or contact your administrator.`,
        },
      },
      unhandled_response: {
        create: {
          log: '[Agentless API] Creating the agentless agent failed with an unhandled response.',
          message: `The Agentless API could not create the agentless agent due to an unexpected error. Please delete the agentless policy ${agentlessPolicyId} and try again or contact your administrator.`,
        },
        delete: {
          log: '[Agentless API] Deleting the agentless deployment failed with an unhandled response.',
          message: `The Agentless API could not delete the agentless deployment due to an unexpected error. Please delete the agentless policy ${agentlessPolicyId} and try again or contact your administrator.`,
        },
        upgrade: {
          log: '[Agentless API] Upgrading the agentless agent failed with an unhandled response.',
          message: `The Agentless API could not upgrade the agentless agent due to an unexpected error. Please delete the agentless policy ${agentlessPolicyId} and try again or contact your administrator.`,
        },
      },
      request_error: {
        create: {
          log: '[Agentless API] Creating the agentless agent failed with a request error.',
          message: `The Agentless API could not create the agentless agent due to a request error. Please delete the agentless policy ${agentlessPolicyId} and try again or contact your administrator.`,
        },
        delete: {
          log: '[Agentless API] Deleting the agentless deployment failed with a request error.',
          message: `The Agentless API could not delete the agentless deployment due to a request error. Please delete the agentless policy ${agentlessPolicyId} and try again or contact your administrator.`,
        },
        upgrade: {
          log: '[Agentless API] Upgrading the agentless agent failed with a request error.',
          message: `The Agentless API could not upgrade the agentless agent due to a request error. Please delete the agentless policy ${agentlessPolicyId} and try again or contact your administrator.`,
        },
      },
    };
  }

  private handleErrorsWithRetries = async (
    error: AxiosError,
    requestConfig: AxiosRequestConfig,
    action: 'create' | 'delete' | 'upgrade',
    logger: Logger,
    retries: number,
    id: string,
    requestConfigDebugStatus: string,
    errorMetadata: any,
    traceId?: string
  ) => {
    const hasRetryableStatusError = this.hasRetryableStatusError(error, RETRYABLE_HTTP_STATUSES);
    const hasRetryableCodeError = this.hasRetryableCodeError(error, RETRYABLE_SERVER_CODES);

    if (hasRetryableStatusError || hasRetryableCodeError) {
      await this.retry(
        async () => await axios(requestConfig),
        action,
        requestConfigDebugStatus,
        logger,
        retries,
        () =>
          this.catchAgentlessApiError(
            action,
            error,
            logger,
            id,
            requestConfig,
            requestConfigDebugStatus,
            errorMetadata,
            traceId
          )
      );
    } else {
      this.catchAgentlessApiError(
        action,
        error,
        logger,
        id,
        requestConfig,
        requestConfigDebugStatus,
        errorMetadata,
        traceId
      );
    }
  };

  private retry = async <T>(
    fn: () => Promise<unknown>,
    action: 'create' | 'delete' | 'upgrade',
    requestConfigDebugStatus: string,
    logger: Logger,
    retries = MAXIMUM_RETRIES,
    throwAgentlessError: () => void
  ) => {
    for (let i = 0; i < retries; i++) {
      try {
        await fn();
      } catch (e) {
        logger.info(
          `[Agentless API] Attempt ${i + 1} failed to ${action} agentless deployment, retrying...`
        );
        if (i === retries - 1) {
          logger.error(
            `[Agentless API] Reached maximum ${retries} attempts. Failed to ${action} agentless deployment with [REQUEST]: ${requestConfigDebugStatus}`
          );
          throwAgentlessError();
        }
      }
    }
  };

  private hasRetryableStatusError = (
    error: AxiosError,
    retryableStatusErrors: number[]
  ): boolean => {
    const status = error?.response?.status;
    return !!status && retryableStatusErrors.some((errorStatus) => errorStatus === status);
  };

  private hasRetryableCodeError = (error: AxiosError, retryableCodeErrors: string[]): boolean => {
    const code = error?.code;
    return !!code && retryableCodeErrors.includes(code);
  };
}

export const agentlessAgentService = new AgentlessAgentService();

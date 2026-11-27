/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import https from 'https';

import { escapeQuotes } from '@kbn/es-query';
import { schema, SchemaTypeError, ValidationError } from '@kbn/config-schema';

import type { ElasticsearchClient, LogMeta, SavedObjectsClientContract } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { SslConfig, sslSchema } from '@kbn/server-http-tools';
import pRetry, { type FailedAttemptError } from 'p-retry';
import { pick } from 'lodash';

import type { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';

import apm from 'elastic-apm-node';
import semverMajor from 'semver/functions/major';
import semverPrerelease from 'semver/functions/prerelease';
import semverValid from 'semver/functions/valid';

import {
  AgentlessAgentCreateOverProvisionedError,
  AgentlessAgentCreateFleetUnreachableError,
} from '../../../common/errors';
import { SO_SEARCH_LIMIT } from '../../constants';
import type { AgentPolicy, FullAgentPolicy } from '../../types';
import type {
  AgentlessApiDeploymentResponse,
  AgentlessApiListDeploymentResponse,
  FleetServerHost,
} from '../../../common/types';
import {
  AgentlessAgentConfigError,
  AgentlessAgentCreateError,
  AgentlessAgentDeleteError,
  AgentlessAgentListError,
  AgentlessAgentListNotFoundError,
  AgentlessAgentUpgradeError,
} from '../../errors';
import {
  AGENTLESS_GLOBAL_TAG_NAME_ORGANIZATION,
  AGENTLESS_GLOBAL_TAG_NAME_DIVISION,
  AGENTLESS_GLOBAL_TAG_NAME_TEAM,
  ECH_AGENTLESS_OUTPUT_ID,
  ECH_AGENTLESS_MANAGED_BULK_OUTPUT_ID,
  ECH_AGENTLESS_FLEET_SERVER_HOST_ID,
  SERVERLESS_AGENTLESS_OUTPUT_ID,
  SERVERLESS_AGENTLESS_MANAGED_BULK_OUTPUT_ID,
  SERVERLESS_AGENTLESS_FLEET_SERVER_HOST_ID,
} from '../../constants';
import {
  canUseManagedBulk,
  type AgentPolicyForOutputEligibility,
} from '../../../common/services/output_helpers';

import { appContextService } from '../app_context';
import { packagePolicyService } from '../package_policy';

import { listEnrollmentApiKeys } from '../api_keys';
import { fleetServerHostService } from '../fleet_server_host';
import type { AgentlessConfig } from '../utils/agentless';
import {
  prependAgentlessApiBasePathToEndpoint,
  isAgentlessEnabled,
  isManagedBulkEnabled,
} from '../utils/agentless';
import {
  AGENTLESS_API_ERROR_CODES,
  MAXIMUM_RETRIES,
  RETRYABLE_HTTP_STATUSES,
  RETRYABLE_SERVER_CODES,
} from '../../../common/constants/agentless';
import { agentPolicyService } from '../agent_policy';

export interface AgentlessRumToken {
  id: string;
  sha256: string;
  created_at: string;
}

export interface AgentlessRumPolicy {
  revision: number;
  enabled: boolean;
  deleted: boolean;
  allowed_origins: string[];
  client_tokens: AgentlessRumToken[];
}

export interface AgentlessRumRequestOptions {
  signal?: AbortSignal;
}

export interface AgentlessRumClient {
  /** Whether the current Fleet config has an HTTPS Agentless endpoint and mTLS credentials. */
  isConfigured(): boolean;
  mintToken(): Promise<AgentlessRumToken & { token: string }>;
  publish(policy: AgentlessRumPolicy, options?: AgentlessRumRequestOptions): Promise<void>;
}

const RUM_API_PATH = '/api/v2/rum';

const RUM_NOT_CONFIGURED = 'AGENTLESS_RUM_NOT_CONFIGURED';

// Drops any fractional seconds from an RFC 3339 UTC timestamp.
const toWholeSeconds = (date: string) => `${date.slice(0, 19)}Z`;

const mintedRumTokenSchema = schema.object(
  {
    id: schema.string({
      minLength: 1,
      maxLength: 128,
      validate: (id) => (/^[A-Za-z0-9_-]+$/.test(id) ? undefined : 'Invalid token ID'),
    }),
    sha256: schema.string({
      minLength: 64,
      maxLength: 64,
      validate: (digest) => (/^[0-9a-f]{64}$/.test(digest) ? undefined : 'Invalid token digest'),
    }),
    created_at: schema.string({
      validate: (date) => {
        // Accept fractional seconds, but check the whole-second UTC value that is stored.
        const wholeSeconds = toWholeSeconds(date);
        const parsed = new Date(wholeSeconds);
        if (
          wholeSeconds === '0001-01-01T00:00:00Z' ||
          !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?Z$/.test(date) ||
          Number.isNaN(parsed.getTime()) ||
          parsed.toISOString() !== `${wholeSeconds.slice(0, -1)}.000Z`
        ) {
          return 'Invalid token creation time';
        }
      },
    }),
    token: schema.string({ minLength: 1 }),
  },
  // Newer Agentless API versions may return extra fields; they are dropped, never persisted.
  { unknowns: 'ignore' }
);

interface AgentlessAgentErrorHandlingMessages {
  [key: string]: {
    [key: string]: {
      log: string;
      message: string;
    };
  };
}

/** The integration package sent to agentless-api as `policy_details.package`. */
interface AgentlessPolicyDetailsPackage {
  name: string;
  version: string;
  policy_template?: string;
  release?: string;
}

/**
 * The release of a package version, or undefined when the version is not valid semver.
 * Mirrors the rule Fleet applies when a package manifest has no `release`
 * (see `epm/archive/parse.ts`).
 */
function getReleaseFromPackageVersion(version: string): 'beta' | 'ga' | undefined {
  if (!semverValid(version)) {
    return undefined;
  }
  return semverPrerelease(version) || semverMajor(version) < 1 ? 'beta' : 'ga';
}

export interface AgentlessAgentService {
  listAgentlessDeployments(opts?: {
    perPage?: number;
    nextPageToken?: string;
  }): Promise<AgentlessApiListDeploymentResponse>;
  createAgentlessAgent(
    esClient: ElasticsearchClient,
    soClient: SavedObjectsClientContract,
    agentlessAgentPolicy: AgentPolicy
  ): Promise<AxiosResponse<AgentlessApiDeploymentResponse> | void>;
  deleteAgentlessAgent(agentlessPolicyId: string): Promise<AxiosResponse | void>;
}

class AgentlessAgentServiceImpl implements AgentlessAgentService {
  /** Creates the mTLS client for the Agentless RUM API. */
  public createRumClient(): AgentlessRumClient {
    const logger = appContextService.getLogger();
    // Resolve the endpoint and TLS per request so config reloads and rotated certificates apply.
    const request = (
      config: AxiosRequestConfig,
      traceId: string | undefined,
      options?: AgentlessRumRequestOptions
    ) => {
      const endpoint = this.getRumEndpoint();
      if (!endpoint) {
        throw Object.assign(new Error('Agentless RUM API is not configured'), {
          code: RUM_NOT_CONFIGURED,
        });
      }
      const tlsConfig = this.createTlsConfig(endpoint.agentlessConfig);
      tlsConfig.rejectUnauthorized = true;
      return axios({
        ...config,
        ...this.getHeaders(tlsConfig, traceId),
        url: `${endpoint.url.href}${config.url ?? ''}`,
        maxRedirects: 0,
        timeout: 10_000,
        signal: options?.signal,
      });
    };

    return {
      isConfigured: () => Boolean(this.getRumEndpoint()),
      mintToken: async () => {
        const traceId = apm.currentTransaction?.traceparent;
        try {
          const { data, status } = await request(
            { method: 'POST', url: '/client_tokens' },
            traceId
          );
          if (status === 201) {
            const minted = mintedRumTokenSchema.validate(data);
            return { ...minted, created_at: toWholeSeconds(minted.created_at) };
          }
          logger.warn(
            this.withRequestIdMessage(
              `[Agentless API] Minting a RUM token returned unexpected status ${status}`,
              traceId
            )
          );
        } catch (error) {
          this.logRumError('Minting a RUM token', error, traceId);
        }
        throw new Error('Failed to mint a RUM token in Agentless API');
      },
      publish: async (policy, options) => {
        const traceId = apm.currentTransaction?.traceparent;
        try {
          const { status } = await request({ method: 'PUT', data: policy }, traceId, options);
          if (status === 200 || status === 201 || status === 204) {
            return;
          }
          logger.warn(
            this.withRequestIdMessage(
              `[Agentless API] Publishing the RUM policy returned unexpected status ${status}`,
              traceId
            )
          );
        } catch (error) {
          this.logRumError('Publishing the RUM policy', error, traceId);
        }
        throw new Error('Failed to publish the RUM policy to Agentless API');
      },
    };
  }

  // RUM only needs the mTLS endpoint. It is turned on by xpack.apm.managedRumEnabled, not by
  // agentless.enabled, which controls Agentless integrations.
  private getRumEndpoint() {
    const agentlessConfig = appContextService.getConfig()?.agentless;
    const api = agentlessConfig?.api;
    const endpoint = api?.rumUrl ?? api?.url;
    if (!endpoint || !api?.tls?.certificate || !api.tls.key) {
      return;
    }
    // The config schema accepts some URIs that URL rejects, such as ports above 65535.
    const url = URL.canParse(endpoint) ? new URL(RUM_API_PATH, endpoint) : undefined;
    return url?.protocol === 'https:' ? { url, agentlessConfig } : undefined;
  }

  /** Logs only non-sensitive failure details: errors can carry tokens, digests, or TLS material. */
  private logRumError(action: string, error: unknown, traceId: string | undefined) {
    const logger = appContextService.getLogger();
    const warn = (message: string) => logger.warn(this.withRequestIdMessage(message, traceId));
    if (axios.isAxiosError(error)) {
      if (error.code === 'ERR_CANCELED') {
        logger.debug(this.withRequestIdMessage(`[Agentless API] ${action} was cancelled`, traceId));
        return;
      }
      warn(
        `[Agentless API] ${action} failed [status: ${error.response?.status ?? 'none'}, code: ${
          error.code ?? 'none'
        }]`
      );
      return;
    }
    if (error instanceof ValidationError) {
      const field = error.cause instanceof SchemaTypeError ? error.cause.path.join('.') : '';
      warn(`[Agentless API] ${action} returned an invalid response [field: ${field || 'unknown'}]`);
      return;
    }
    const code =
      error instanceof Error && 'code' in error && typeof error.code === 'string'
        ? error.code
        : 'none';
    if (code === RUM_NOT_CONFIGURED) {
      warn(`[Agentless API] ${action} skipped: the Agentless RUM API is not configured`);
      return;
    }
    warn(`[Agentless API] ${action} failed [code: ${code}]`);
  }

  /** Fleet server host is chosen purely by cloud environment, independent of the policy. */
  public getDefaultFleetServerId() {
    const cloudSetup = appContextService.getCloud();
    const isCloud = cloudSetup?.isCloudEnabled;
    const isServerless = cloudSetup?.isServerlessEnabled;
    return isServerless
      ? SERVERLESS_AGENTLESS_FLEET_SERVER_HOST_ID
      : isCloud
      ? ECH_AGENTLESS_FLEET_SERVER_HOST_ID
      : undefined;
  }

  /** Data output depends on the policy: connector and OTel policies stay on direct ES. */
  public getDefaultOutputId(agentPolicy: AgentPolicyForOutputEligibility) {
    const cloudSetup = appContextService.getCloud();
    const isCloud = cloudSetup?.isCloudEnabled;
    const isServerless = cloudSetup?.isServerlessEnabled;
    // TODO(cursor-state): https://github.com/elastic/ingest-dev/issues/8636 — the managed bulk
    // output has no usable direct-ES URL for the agentless state store; cursor state routing is
    // unresolved and not wired up here.
    const useManagedBulk = isManagedBulkEnabled() && canUseManagedBulk(agentPolicy);
    return isServerless
      ? useManagedBulk
        ? SERVERLESS_AGENTLESS_MANAGED_BULK_OUTPUT_ID
        : SERVERLESS_AGENTLESS_OUTPUT_ID
      : isCloud
      ? useManagedBulk
        ? ECH_AGENTLESS_MANAGED_BULK_OUTPUT_ID
        : ECH_AGENTLESS_OUTPUT_ID
      : undefined;
  }

  public getDefaultSettings(agentPolicy: AgentPolicyForOutputEligibility) {
    return {
      outputId: this.getDefaultOutputId(agentPolicy),
      fleetServerId: this.getDefaultFleetServerId(),
    };
  }

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
      agentlessAgentPolicy
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
    const fullPolicy = await agentPolicyService.getFullAgentPolicy(
      soClient,
      agentlessAgentPolicy.id
    );
    const policyDetails = await this.getPolicyDetails(
      soClient,
      fullPolicy,
      agentlessAgentPolicy.id
    );

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
        agent_policy: fullPolicy,
      },
      method: 'POST',
      ...this.getHeaders(tlsConfig, traceId),
    };

    const cloudSetup = appContextService.getCloud();
    if (!cloudSetup?.isServerlessEnabled) {
      requestConfig.data.stack_version = appContextService.getKibanaVersion();
      requestConfig.data.is_elastic_staff_owned = cloudSetup?.isElasticStaffOwned ?? false;
      Object.assign(requestConfig.data, this.getCloudDeploymentIds());
    }

    const requestConfigDebugStatus = this.createRequestConfigDebug(requestConfig);

    logger.debug(
      `[Agentless API] Creating agentless agent with request config ${requestConfigDebugStatus}`
    );

    const response = await pRetry(() => axios<AgentlessApiDeploymentResponse>(requestConfig), {
      retries: MAXIMUM_RETRIES,
      minTimeout: 0,
      maxTimeout: 100,
      onFailedAttempt: (error: FailedAttemptError) => {
        if (!this.isErrorRetryable(error as unknown as AxiosError)) {
          throw error;
        }
        if (error.retriesLeft > 0) {
          logger.warn(
            `[Agentless API] Retrying creating agentless agent ${agentlessAgentPolicy.id}`,
            { error }
          );
        }
      },
    }).catch((error: Error | AxiosError) => {
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
    });

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
        ...this.getCloudDeploymentIds(),
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

  public async listAgentlessDeployments(opts?: { perPage?: number; nextPageToken?: string }) {
    const logger = appContextService.getLogger();

    const traceId = apm.currentTransaction?.traceparent;
    const agentlessConfig = appContextService.getConfig()?.agentless;
    const tlsConfig = this.createTlsConfig(agentlessConfig);
    const requestConfig: AxiosRequestConfig = {
      url: prependAgentlessApiBasePathToEndpoint(agentlessConfig, '/deployments'),
      method: 'GET',
      params: {
        next_token: opts?.nextPageToken,
        limit: opts?.perPage,
      },
      ...this.getHeaders(tlsConfig, traceId),
    };

    const errorMetadata: LogMeta = {
      trace: {
        id: traceId,
      },
    };

    const requestConfigDebugStatus = this.createRequestConfigDebug(requestConfig);

    logger.debug(`[Agentless API] Start listing agentless deployments`);

    if (!isAgentlessEnabled) {
      logger.error(
        '[Agentless API] Agentless API is not supported. Listing agentless deployments is not supported in non-cloud or non-serverless environments'
      );
    }

    if (!agentlessConfig) {
      logger.error('[Agentless API] kibana.yml is currently missing Agentless API configuration');
    }

    logger.debug(`[Agentless API] Listing agentless deployments with TLS config with certificate`);

    logger.debug(
      `[Agentless API] Listing agentless deployments with request config ${requestConfigDebugStatus}`
    );

    const response = await axios(requestConfig).catch((error: AxiosError) => {
      this.catchAgentlessApiError(
        'list',
        error,
        logger,
        undefined,
        requestConfig,
        requestConfigDebugStatus,
        errorMetadata,
        traceId
      );
    });

    return response.data;
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
    fullPolicy: FullAgentPolicy | null,
    agentPolicyId: string
  ) {
    const pkg = await this.getIntegrationPackage(soClient, agentPolicyId);
    return {
      output_name: Object.keys(fullPolicy?.outputs || {})?.[0], // Agentless policies only have one output
      // OTel integrations have their `otelcol` inputs moved out of `inputs` in the full agent
      // policy, so agentless-api cannot derive the package from `inputs[].meta.package`.
      // Send it explicitly so the deployment still gets its integration labels.
      ...(pkg ? { package: pkg } : {}),
    };
  }

  /**
   * The Elastic Cloud deployment ID and the Elasticsearch cluster ID of this deployment.
   * Returns an empty object on Serverless or when Cloud does not expose the IDs.
   */
  private getCloudDeploymentIds(): { deployment_id?: string; elasticsearch_cluster_id?: string } {
    const cloudSetup = appContextService.getCloud();
    if (!cloudSetup?.isCloudEnabled || cloudSetup.isServerlessEnabled) {
      return {};
    }
    return {
      ...(cloudSetup.deploymentId ? { deployment_id: cloudSetup.deploymentId } : {}),
      ...(cloudSetup.elasticsearchClusterId
        ? { elasticsearch_cluster_id: cloudSetup.elasticsearchClusterId }
        : {}),
    };
  }

  /**
   * The (single) non-system integration package of an agentless policy, if any, with the same
   * fields a non-OTel policy carries in `inputs[].meta.package`.
   */
  private async getIntegrationPackage(
    soClient: SavedObjectsClientContract,
    agentPolicyId: string
  ): Promise<AgentlessPolicyDetailsPackage | undefined> {
    try {
      const packagePolicies = await packagePolicyService.findAllForAgentPolicy(
        soClient,
        agentPolicyId
      );
      const packagePolicy = packagePolicies?.find(
        (pp) => pp.package?.name && pp.package.name !== 'system'
      );
      if (!packagePolicy?.package) {
        return undefined;
      }
      const pkg = packagePolicy.package;

      // agentless-api labels a deployment from its first integration input only, so use the
      // policy template of the first enabled input here as well.
      const policyTemplate = packagePolicy.inputs?.find((input) => input.enabled)?.policy_template;
      const release = getReleaseFromPackageVersion(pkg.version);

      return {
        name: pkg.name,
        version: pkg.version,
        ...(policyTemplate ? { policy_template: policyTemplate } : {}),
        ...(release ? { release } : {}),
      };
    } catch (error) {
      // Labelling is best effort: never fail the deployment because of it.
      appContextService
        .getLogger()
        .warn(
          `[Agentless API] Could not resolve integration package for ${agentPolicyId}: ${error}`
        );
      return undefined;
    }
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
    policy: AgentPolicy
  ) {
    const { items: enrollmentApiKeys } = await listEnrollmentApiKeys(esClient, {
      perPage: SO_SEARCH_LIMIT,
      showInactive: true,
      kuery: `policy_id:"${escapeQuotes(policy.id)}"`,
    });

    if (!enrollmentApiKeys.length) {
      throw new AgentlessAgentConfigError('missing Fleet enrollment token');
    }

    if (!policy.fleet_server_host_id) {
      throw new AgentlessAgentConfigError('missing fleet_server_host_id');
    }

    let defaultFleetHost: FleetServerHost;

    try {
      defaultFleetHost = await fleetServerHostService.get(policy.fleet_server_host_id);
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
        ...pick(
          requestConfig.data,
          'policy_id',
          'fleet_url',
          'labels',
          'resources',
          'cloud_connectors',
          'is_elastic_staff_owned'
        ),
        agent_policy: '[REDACTED]',
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
    action: 'create' | 'delete' | 'upgrade' | 'list',
    error: Error | AxiosError,
    logger: Logger,
    agentlessPolicyId: string | undefined,
    requestConfig: AxiosRequestConfig,
    requestConfigDebugStatus: string,
    errorMetadata: LogMeta,
    traceId?: string
  ): never {
    const errorMetadataWithRequestConfig: LogMeta = {
      ...errorMetadata,
      http: {
        request: {
          id: traceId,
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
      if (action === 'list') {
        errorLogMessage = `[Agentless API] Listing agentless deployments failed with an error that is not an Axios error for agentless policy`;
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
        `Could not ${action} the managed integration. Please try again, or contact your administrator.`,
        traceId
      );
    }
  }

  private handleResponseError(
    action: 'create' | 'delete' | 'upgrade' | 'list',
    response: AxiosResponse,
    logger: Logger,
    errorMetadataWithRequestConfig: LogMeta,
    requestConfigDebugStatus: string,
    logMessage: string,
    userMessage: string,
    traceId?: string
  ): never {
    logger.error(
      `${logMessage} ${JSON.stringify(response.status)} ${JSON.stringify(
        pick(response.data ?? {}, 'code', 'error')
      )}} ${requestConfigDebugStatus}`,
      {
        ...errorMetadataWithRequestConfig,
        http: {
          ...errorMetadataWithRequestConfig.http,
          response: {
            status_code: response?.status,
          },
        },
      }
    );

    const responseData = {
      code: response?.data?.code,
      error: response?.data?.error,
      statusCode: response?.status,
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
      statusCode?: number;
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
      } else if (responseData?.code === AGENTLESS_API_ERROR_CODES.FLEET_UNREACHABLE) {
        return new AgentlessAgentCreateFleetUnreachableError(
          this.withRequestIdMessage(userMessage, traceId)
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
    if (action === 'list') {
      if (responseData?.statusCode === 404) {
        return new AgentlessAgentListNotFoundError(this.withRequestIdMessage(userMessage, traceId));
      }

      return new AgentlessAgentListError(this.withRequestIdMessage(userMessage, traceId));
    }
  }

  private getErrorHandlingMessages(
    agentlessPolicyId?: string
  ): AgentlessAgentErrorHandlingMessages {
    return {
      400: {
        create: {
          log: '[Agentless API] Creating the agentless agent failed with a status 400, bad request for agentless policy.',
          message: `Could not create the managed integration. Please delete the managed integration ${agentlessPolicyId} and try again, or contact your administrator.`,
        },
        delete: {
          log: '[Agentless API] Deleting the agentless deployment failed with a status 400, bad request for agentless policy.',
          message: `Could not delete the managed integration. Please delete the managed integration ${agentlessPolicyId} and try again, or contact your administrator.`,
        },
        upgrade: {
          log: '[Agentless API] Upgrading the agentless agent failed with a status 400, bad request for agentless policy.',
          message: `Could not upgrade the managed integration. Please delete the managed integration ${agentlessPolicyId} and try again, or contact your administrator.`,
        },
        list: {
          log: '[Agentless API] Listing agentless deployments failed with a status 400, bad request.',
          message: `Could not list managed integrations. Please try again, or contact your administrator.`,
        },
      },
      401: {
        create: {
          log: '[Agentless API] Creating the agentless agent failed with a status 401 unauthorized for agentless policy.',
          message: `Could not create the managed integration. Please delete the managed integration ${agentlessPolicyId} and try again, or contact your administrator.`,
        },
        delete: {
          log: '[Agentless API] Deleting the agentless deployment failed with a status 401 unauthorized for agentless policy.',
          message: `Could not delete the managed integration. Please delete the managed integration ${agentlessPolicyId} and try again, or contact your administrator.`,
        },
        upgrade: {
          log: '[Agentless API] Upgrading the agentless agent failed with a status 401 unauthorized for agentless policy.',
          message: `Could not upgrade the managed integration. Please delete the managed integration ${agentlessPolicyId} and try again, or contact your administrator.`,
        },
        list: {
          log: '[Agentless API] Listing agentless deployments failed with a status 401 unauthorized.',
          message: `Could not list managed integrations. Please try again, or contact your administrator.`,
        },
      },
      403: {
        create: {
          log: '[Agentless API] Creating the agentless agent failed with a status 403 forbidden for agentless policy.',
          message: `Could not create the managed integration. Please delete the managed integration ${agentlessPolicyId} and try again, or contact your administrator.`,
        },
        delete: {
          log: '[Agentless API] Deleting the agentless deployment failed with a status 403 forbidden for agentless policy.',
          message: `Could not delete the managed integration. Please delete the managed integration ${agentlessPolicyId} and try again, or contact your administrator.`,
        },
        upgrade: {
          log: '[Agentless API] Upgrading the agentless agent failed with a status 403 forbidden for agentless policy.',
          message: `Could not upgrade the managed integration. Please delete the managed integration ${agentlessPolicyId} and try again, or contact your administrator.`,
        },
        list: {
          log: '[Agentless API] Listing agentless deployments failed with a status 403 forbidden.',
          message: `Could not list managed integrations. Please try again, or contact your administrator.`,
        },
      },
      404: {
        create: {
          log: '[Agentless API] Creating the agentless agent failed with a status 404 not found.',
          message: `Could not create the managed integration. Please delete the managed integration ${agentlessPolicyId} and try again, or contact your administrator.`,
        },
        delete: {
          log: '[Agentless API] Deleting the agentless deployment failed with a status 404 not found.',
          message: `Could not delete the managed integration. Please delete the managed integration ${agentlessPolicyId} and try again, or contact your administrator.`,
        },
        upgrade: {
          log: '[Agentless API] Upgrading the agentless agent failed with a status 404 not found.',
          message: `Could not upgrade the managed integration. Please delete the managed integration ${agentlessPolicyId} and try again, or contact your administrator.`,
        },
        list: {
          log: '[Agentless API] Listing agentless deployments failed with a status 404 not found.',
          message: `Could not list managed integrations. Please try again, or contact your administrator.`,
        },
      },
      408: {
        create: {
          log: '[Agentless API] Creating the agentless agent failed with a status 408, the request timed out.',
          message: `The request timed out. Please wait a few minutes for the managed integration to finish setting up. If it does not, delete the managed integration ${agentlessPolicyId} and try again, or contact your administrator.`,
        },
        delete: {
          log: '[Agentless API] Deleting the agentless deployment failed with a status 408, the request timed out.',
          message: `The request timed out. Please wait a few minutes for the managed integration to be removed. If it persists, delete the managed integration ${agentlessPolicyId} and try again, or contact your administrator.`,
        },
        upgrade: {
          log: '[Agentless API] Upgrading the agentless agent failed with a status 408, the request timed out.',
          message: `The request timed out during the upgrade. Please try again later, or contact your administrator.`,
        },
        list: {
          log: '[Agentless API] Listing agentless deployments failed with a status 408 request timed out.',
          message: `Could not list managed integrations. Please try again, or contact your administrator.`,
        },
      },
      429: {
        create: {
          log: '[Agentless API] Creating the agentless agent failed with a status 429, agentless agent limit reached.',
          message:
            'You have reached the limit for managed integrations. Please remove some or switch to agent-based integrations.',
        },
        upgrade: {
          log: '[Agentless API] Upgrading the agentless agent failed with a status 429, agentless agent limit reached.',
          message:
            'You have reached the limit for managed integrations. Please remove some or switch to agent-based integrations.',
        },
        list: {
          log: '[Agentless API] Listing agentless deployments failed with a status 429, agentless agent limit reached.',
          message: `Could not list managed integrations. Please try again, or contact your administrator.`,
        },
      },
      500: {
        create: {
          log: '[Agentless API] Creating the agentless agent failed with a status 500 internal service error.',
          message: `Could not create the managed integration. Please delete the managed integration ${agentlessPolicyId} and try again, or contact your administrator.`,
        },
        delete: {
          log: '[Agentless API] Deleting the agentless deployment failed with a status 500 internal service error.',
          message: `Could not delete the managed integration. Please delete the managed integration ${agentlessPolicyId} and try again, or contact your administrator.`,
        },
        upgrade: {
          log: '[Agentless API] Upgrading the agentless agent failed with a status 500 internal service error.',
          message: `Could not upgrade the managed integration. Please delete the managed integration ${agentlessPolicyId} and try again, or contact your administrator.`,
        },
        list: {
          log: '[Agentless API] Listing agentless deployments failed with a status 500 internal service error.',
          message: `Could not list managed integrations. Please try again, or contact your administrator.`,
        },
      },
      unhandled_response: {
        create: {
          log: '[Agentless API] Creating the agentless agent failed with an unhandled response.',
          message: `Could not create the managed integration. Please delete the managed integration ${agentlessPolicyId} and try again, or contact your administrator.`,
        },
        delete: {
          log: '[Agentless API] Deleting the agentless deployment failed with an unhandled response.',
          message: `Could not delete the managed integration. Please delete the managed integration ${agentlessPolicyId} and try again, or contact your administrator.`,
        },
        upgrade: {
          log: '[Agentless API] Upgrading the agentless agent failed with an unhandled response.',
          message: `Could not upgrade the managed integration. Please delete the managed integration ${agentlessPolicyId} and try again, or contact your administrator.`,
        },
        list: {
          log: '[Agentless API] Listing agentless deployments failed with an unhandled response.',
          message: `Could not list managed integrations. Please try again, or contact your administrator.`,
        },
      },
      request_error: {
        create: {
          log: '[Agentless API] Creating the agentless agent failed with a request error.',
          message: `Could not create the managed integration. Please delete the managed integration ${agentlessPolicyId} and try again, or contact your administrator.`,
        },
        delete: {
          log: '[Agentless API] Deleting the agentless deployment failed with a request error.',
          message: `Could not delete the managed integration. Please delete the managed integration ${agentlessPolicyId} and try again, or contact your administrator.`,
        },
        upgrade: {
          log: '[Agentless API] Upgrading the agentless agent failed with a request error.',
          message: `Could not upgrade the managed integration. Please delete the managed integration ${agentlessPolicyId} and try again, or contact your administrator.`,
        },
        list: {
          log: '[Agentless API] Listing agentless deployments failed with a request error.',
          message: `Could not list managed integrations. Please try again, or contact your administrator.`,
        },
      },
    };
  }

  private isErrorRetryable = (error: AxiosError): boolean => {
    const hasRetryableStatusError = this.hasRetryableStatusError(error, RETRYABLE_HTTP_STATUSES);
    const hasRetryableCodeError = this.hasRetryableCodeError(error, RETRYABLE_SERVER_CODES);

    return hasRetryableStatusError || hasRetryableCodeError;
  };

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
    if (this.isErrorRetryable(error)) {
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

export const agentlessAgentService = new AgentlessAgentServiceImpl();

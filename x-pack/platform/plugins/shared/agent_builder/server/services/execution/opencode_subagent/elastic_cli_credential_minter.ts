/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';

export interface ElasticCliCredentials {
  configYml: string;
  source: 'request' | 'minted';
  revoke: () => Promise<void>;
}

export type ElasticCliAccess = 'read' | 'write';

export interface ElasticCliCredentialRequest {
  kibana?: ElasticCliAccess;
  elasticsearch?: ElasticCliAccess;
}

export interface ElasticCliCredentialMinterConfig {
  kibanaUrl: string;
  elasticsearchUrl?: string;
  spaceId?: string;
  access: ElasticCliCredentialRequest;
}

const shDoubleQuote = (value: string): string => JSON.stringify(value);

const apiKeyFromAuthorizationHeader = (request: KibanaRequest): string | undefined => {
  const raw = request.headers?.authorization;
  const header = Array.isArray(raw) ? raw[0] : raw;
  if (typeof header !== 'string') {
    return undefined;
  }

  const [scheme, value] = header.split(/\s+/, 2);
  if (scheme?.toLowerCase() !== 'apikey' || !value) {
    return undefined;
  }
  return value;
};

const addSpaceToKibanaUrl = (kibanaUrl: string, spaceId?: string): string => {
  if (!spaceId || spaceId === 'default') {
    return kibanaUrl;
  }

  const url = new URL(kibanaUrl);
  const pathname = url.pathname.replace(/\/$/, '');
  url.pathname = `${pathname}/s/${encodeURIComponent(spaceId)}`;
  return url.toString().replace(/\/$/, '');
};

const buildConfigYml = ({
  apiKey,
  kibanaUrl,
  elasticsearchUrl,
  access,
}: {
  apiKey: string;
  kibanaUrl: string;
  elasticsearchUrl?: string;
  access: ElasticCliCredentialRequest;
}): string => {
  const lines = ['current_context: sandbox', '', 'contexts:', '  sandbox:'];

  if (access.kibana) {
    lines.push(
      '    kibana:',
      `      url: ${shDoubleQuote(kibanaUrl)}`,
      '      auth:',
      `        api_key: ${shDoubleQuote(apiKey)}`
    );
  }

  if (access.elasticsearch && elasticsearchUrl) {
    lines.push(
      '    elasticsearch:',
      `      url: ${shDoubleQuote(elasticsearchUrl)}`,
      '      auth:',
      `        api_key: ${shDoubleQuote(apiKey)}`
    );
  }

  lines.push('');
  return lines.join('\n');
};

const elasticsearchPrivilegesForAccess = (
  access: ElasticCliCredentialRequest
): {
  cluster: string[];
  indices: Array<{ names: string[]; privileges: string[] }>;
  run_as: string[];
} => {
  if (access.elasticsearch === 'write') {
    return {
      cluster: ['all'],
      indices: [{ names: ['*'], privileges: ['all'] }],
      run_as: ['*'],
    };
  }

  if (access.elasticsearch === 'read') {
    return {
      cluster: ['monitor'],
      indices: [{ names: ['*'], privileges: ['read', 'view_index_metadata'] }],
      run_as: [],
    };
  }

  return { cluster: [], indices: [], run_as: [] };
};

const kibanaPrivilegesForAccess = (
  access: ElasticCliCredentialRequest,
  spaceId?: string
): Array<{ spaces: string[]; base: string[]; feature: Record<string, string[]> }> => {
  if (!access.kibana) {
    return [];
  }

  return [
    {
      spaces: [spaceId && spaceId !== 'default' ? spaceId : '*'],
      base: [access.kibana === 'write' ? 'all' : 'read'],
      feature: {},
    },
  ];
};

/**
 * Produces a run-scoped Elastic CLI config for first-party Kibana/Elasticsearch
 * access. When the run already carries an API key, reuse it. Otherwise grant a
 * short-lived API key on behalf of the current user and revoke it after the run.
 */
export class ElasticCliCredentialMinter {
  constructor(private readonly security: SecurityServiceStart, private readonly logger: Logger) {}

  async mint(
    request: KibanaRequest,
    { kibanaUrl, elasticsearchUrl, spaceId, access }: ElasticCliCredentialMinterConfig,
    expiration = '1h'
  ): Promise<ElasticCliCredentials | undefined> {
    if (!access.kibana && !access.elasticsearch) {
      return undefined;
    }

    const scopedKibanaUrl = addSpaceToKibanaUrl(kibanaUrl, spaceId);
    const reusedApiKey = apiKeyFromAuthorizationHeader(request);
    if (reusedApiKey) {
      this.logger.info('Reusing request API key for Elastic CLI sandbox config');
      return {
        configYml: buildConfigYml({
          apiKey: reusedApiKey,
          kibanaUrl: scopedKibanaUrl,
          elasticsearchUrl,
          access,
        }),
        source: 'request',
        revoke: async () => {},
      };
    }

    try {
      const grant = await this.security.authc.apiKeys.grantAsInternalUser(request, {
        name: `opencode-elastic-cli-${Date.now()}`,
        expiration,
        metadata: { managed: true, managed_by: 'agent_builder_opencode_subagent_elastic_cli' },
        kibana_role_descriptors: {
          opencode_elastic_cli: {
            elasticsearch: elasticsearchPrivilegesForAccess(access),
            kibana: kibanaPrivilegesForAccess(access, spaceId),
          },
        },
      });

      if (!grant) {
        this.logger.warn('Unable to create Elastic CLI API key (API keys may be disabled)');
        return undefined;
      }

      const apiKey = Buffer.from(`${grant.id}:${grant.api_key}`).toString('base64');
      this.logger.info(`Minted Elastic CLI API key ${grant.id} (ttl=${expiration})`);

      return {
        configYml: buildConfigYml({
          apiKey,
          kibanaUrl: scopedKibanaUrl,
          elasticsearchUrl,
          access,
        }),
        source: 'minted',
        revoke: async () => {
          try {
            await this.security.authc.apiKeys.invalidateAsInternalUser({ ids: [grant.id] });
            this.logger.info(`Revoked Elastic CLI API key ${grant.id}`);
          } catch (error) {
            this.logger.warn(
              `Failed to invalidate Elastic CLI API key ${grant.id}: ${(error as Error).message}`
            );
          }
        },
      };
    } catch (error) {
      this.logger.warn(`Failed to mint Elastic CLI API key: ${(error as Error).message}`);
      return undefined;
    }
  }
}

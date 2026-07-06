/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { AGENTBUILDER_FEATURE_ID } from '@kbn/agent-builder-plugin/common/features';
import { RelayBadRequestError } from './errors';

/**
 * `metadata.kibana.type` tag on the managed API key, so it can be identified and
 * filtered out of the Stack Management → API keys UI (mirrors alerting's pattern).
 */
export const STREAMS_SLACK_RELAY_API_KEY_TYPE = 'streams_significant_events_slack_relay';

const API_KEY_NAME = 'Streams significant events — Slack relay';

interface CreateDeploymentTokenDeps {
  security: SecurityPluginStart;
  request: KibanaRequest;
  logger: Logger;
}

/**
 * Mints the managed API key the relay-service stores as the deployment token and
 * later uses to call Agent Builder on this deployment. The key is:
 * - granted with read/write access to Agent Builder (feature privilege `all`),
 * - marked `managed` so it is hidden/locked in the API keys management UI.
 *
 * Returns the encoded `base64(id:api_key)` value for `Authorization: ApiKey`.
 */
export const createDeploymentToken = async ({
  security,
  request,
  logger,
}: CreateDeploymentTokenDeps): Promise<string> => {
  const apiKey = await security.authc.apiKeys.grantAsInternalUser(request, {
    name: API_KEY_NAME,
    metadata: { managed: true, kibana: { type: STREAMS_SLACK_RELAY_API_KEY_TYPE } },
    kibana_role_descriptors: {
      [STREAMS_SLACK_RELAY_API_KEY_TYPE]: {
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [{ spaces: ['*'], feature: { [AGENTBUILDER_FEATURE_ID]: ['all'] } }],
      },
    },
  });

  if (!apiKey) {
    logger.error('Unable to create the Agent Builder API key: security is disabled.');
    throw new RelayBadRequestError(
      'Unable to create the Agent Builder API key (security is disabled).'
    );
  }

  return Buffer.from(`${apiKey.id}:${apiKey.api_key}`).toString('base64');
};

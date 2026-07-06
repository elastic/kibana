/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serverUnavailable } from '@hapi/boom';
import { z } from '@kbn/zod/v4';
import type {
  RelayClient,
  StartInstallResponseBody,
  TenantsResponseBody,
} from '../../../../lib/relay';
import type { StreamsServer } from '../../../../types';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { STREAMS_SIGNIFICANT_EVENTS_APPS_ENABLED_FLAG } from '../../../../../common/feature_flags';
import { FeatureNotEnabledError } from '../../../../lib/streams/errors/feature_not_enabled_error';
import { createDeploymentToken } from '../../../../lib/relay';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';

const assertRelayEnabled = ({ server }: { server: StreamsServer }): RelayClient => {
  const isAppsEnabled = server.core.featureFlags.getBooleanValue(
    STREAMS_SIGNIFICANT_EVENTS_APPS_ENABLED_FLAG,
    false
  );
  if (!isAppsEnabled) {
    throw new FeatureNotEnabledError(
      `Apps are disabled. Enable the ${STREAMS_SIGNIFICANT_EVENTS_APPS_ENABLED_FLAG} feature flag.`
    );
  }

  if (!server.relayClient) {
    throw serverUnavailable('Relay is not configured (set xpack.streams.relayService.url).');
  }

  return server.relayClient;
};

const connectSlackRoute = createServerRoute({
  endpoint: 'POST /internal/streams/relay/slack/connect',
  options: {
    access: 'internal',
    summary: 'Start a Slack connection via the relay service',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  handler: async ({
    request,
    server,
    logger,
    getScopedClients,
  }): Promise<StartInstallResponseBody> => {
    // Cheap synchronous guards first, so a disabled/unconfigured instance skips
    // the scoped-clients init and the async access assertion below.
    const relay = assertRelayEnabled({ server });

    const { licensing, uiSettingsClient } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const authUser = server.core.security.authc.getCurrentUser(request);
    const createdByUserKey = authUser?.profile_uid ?? authUser?.username;

    // Mint the managed Agent Builder API key the relay stores and later uses to
    // converse with this deployment.
    const kibanaApiKey = await createDeploymentToken({
      security: server.security,
      request,
      logger,
    });

    return relay.startSlackInstall({ kibanaApiKey, createdByUserKey });
  },
});

const listTenantsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/relay/tenants',
  params: z.object({
    query: z.object({
      limit: z.coerce.number().int().min(1).max(100).optional(),
      cursor: z.string().optional(),
    }),
  }),
  options: {
    access: 'internal',
    summary: 'List connected relay tenants',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  handler: async ({
    params,
    response,
    request,
    server,
    getScopedClients,
  }): Promise<TenantsResponseBody> => {
    // Cheap synchronous guards first, so a disabled/unconfigured instance skips
    // the scoped-clients init and the async access assertion below.
    const relay = assertRelayEnabled({ server });

    const { licensing, uiSettingsClient } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    return relay.listTenants(params.query);
  },
});

export const internalSigEventsRelayRoutes = {
  ...connectSlackRoute,
  ...listTenantsRoute,
};

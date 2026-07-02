/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serverUnavailable } from '@hapi/boom';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import { STREAMS_SIGNIFICANT_EVENTS_APPS_ENABLED_FLAG } from '../../../../../common/feature_flags';
import { FeatureNotEnabledError } from '../../../../lib/streams/errors/feature_not_enabled_error';
import { RelayClientImpl, createDeploymentToken } from '../../../../lib/relay';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';

const connectSlackRoute = createServerRoute({
  endpoint: 'POST /internal/streams/apps/slack/connect',
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
  }): Promise<{ authorizeUrl: string }> => {
    // Cheap synchronous guards first, so a disabled/unconfigured instance skips
    // the scoped-clients init and the async access assertion below.
    const isAppsEnabled = server.core.featureFlags.getBooleanValue(
      STREAMS_SIGNIFICANT_EVENTS_APPS_ENABLED_FLAG,
      false
    );
    if (!isAppsEnabled) {
      throw new FeatureNotEnabledError(
        `Apps are disabled. Enable the ${STREAMS_SIGNIFICANT_EVENTS_APPS_ENABLED_FLAG} feature flag.`
      );
    }

    const relayUrl = server.config.relayService?.url;
    if (!relayUrl) {
      throw serverUnavailable(
        'Slack connect is not configured (set xpack.streams.relayService.url).'
      );
    }

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

    const relay = new RelayClientImpl({
      baseUrl: relayUrl,
      headers: server.config.relayService?.headers,
      logger,
    });
    return relay.startSlackInstall({ kibanaApiKey, createdByUserKey });
  },
});

export const internalSigEventsAppsRoutes = {
  ...connectSlackRoute,
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { badGateway } from '@hapi/boom';
import { RelayRequestError } from '@kbn/actions-plugin/server';
import { createServerRoute } from '../../../create_server_route';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import type {
  SlackAppConnectResponse,
  SlackAppDisconnectResponse,
  SlackAppStatusResponse,
} from '../../../../../common/slack_app/types';
import { SlackAppService } from '../../../../lib/slack_app/service';

const connectSlackAppRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/apps/slack/connect',
  options: {
    access: 'internal',
    summary: 'Start the Elastic Slack App install',
    description:
      'Mints a managed Agent Builder API key for the Nightshift Relay, starts the Slack OAuth install, and returns the Slack authorization URL.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({}),
  handler: async ({ request, server }): Promise<SlackAppConnectResponse> => {
    try {
      return await new SlackAppService(server).connect(request);
    } catch (error) {
      // Surface the Relay's own reason (e.g. "workspace already bound") instead
      // of a generic 500. SlackAppUnavailableError is a StatusError, so it's
      // already mapped to a 400 by the shared createServerRoute error handler.
      if (error instanceof RelayRequestError) {
        throw badGateway(error.relayMessage ?? error.message);
      }
      throw error;
    }
  },
});

const statusSlackAppRoute = createServerRoute({
  endpoint: 'GET /internal/significant_events/apps/slack/status',
  options: {
    access: 'internal',
    summary: 'Get Elastic Slack App connection status',
    description:
      'Returns whether the Elastic Slack App is available and its current connection state, advancing an in-progress install when the Relay reports completion.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({}),
  handler: async ({ request, server }): Promise<SlackAppStatusResponse> => {
    return new SlackAppService(server).getStatus(request);
  },
});

const disconnectSlackAppRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/apps/slack/disconnect',
  options: {
    access: 'internal',
    summary: 'Disconnect the Elastic Slack App',
    description:
      'Invalidates the managed API key, asks the Relay to unbind the workspace, and clears the stored connection state.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({}),
  handler: async ({ request, server }): Promise<SlackAppDisconnectResponse> => {
    return new SlackAppService(server).disconnect(request);
  },
});

export const internalSlackAppRoutes = {
  ...connectSlackAppRoute,
  ...statusSlackAppRoute,
  ...disconnectSlackAppRoute,
};

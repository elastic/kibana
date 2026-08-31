/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { badGateway, conflict, forbidden, notFound } from '@hapi/boom';
import { RelayRequestError } from '@kbn/actions-plugin/server';
import { createServerRoute } from '../../../create_server_route';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import type {
  SlackAppBindChannelResponse,
  SlackAppBindingsResponse,
  SlackAppConnectResponse,
  SlackAppDisconnectResponse,
  SlackAppStatusResponse,
  SlackAppUnbindChannelResponse,
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
    try {
      return await new SlackAppService(server).disconnect(request);
    } catch (error) {
      if (error instanceof RelayRequestError) throwRelayError(error);
      throw error;
    }
  },
});

const bindingsSlackAppRoute = createServerRoute({
  endpoint: 'GET /internal/significant_events/apps/slack/bindings',
  options: {
    access: 'internal',
    summary: 'List bound Slack channels',
    description:
      'Returns a single page of Slack channel bindings for the connected workspace, as reported by the Relay. Use `cursor` (from a previous response `nextCursor`) and `perPage` to paginate.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    query: z.object({
      cursor: z.string().max(1024).optional(),
      perPage: z.coerce.number().int().min(1).max(200).optional(),
    }),
  }),
  handler: async ({ params, request, server }): Promise<SlackAppBindingsResponse> => {
    try {
      return await new SlackAppService(server).listBindings(request, params.query);
    } catch (error) {
      if (error instanceof RelayRequestError) throwRelayError(error);
      throw error;
    }
  },
});

function throwRelayError(error: RelayRequestError): never {
  const msg = error.relayMessage ?? error.message;
  if (error.statusCode === 409) throw conflict(msg);
  if (error.statusCode === 403) throw forbidden(msg);
  if (error.statusCode === 404) throw notFound(msg);
  throw badGateway(msg);
}

const bindChannelSlackAppRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/apps/slack/bindings/{channelId}/bind',
  options: {
    access: 'internal',
    summary: 'Bind a Slack channel to this deployment',
    description:
      'Claims an unclaimed channel for this deployment (put-if-absent). Returns 409 if the channel is already claimed by another deployment.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ channelId: z.string().max(32) }),
  }),
  handler: async ({ params, request, server }): Promise<SlackAppBindChannelResponse> => {
    try {
      await new SlackAppService(server).bindChannel(request, params.path.channelId);
    } catch (error) {
      if (error instanceof RelayRequestError) throwRelayError(error);
      throw error;
    }
    return { status: 'bound' };
  },
});

const unbindChannelSlackAppRoute = createServerRoute({
  endpoint: 'POST /internal/significant_events/apps/slack/bindings/{channelId}/unbind',
  options: {
    access: 'internal',
    summary: 'Unbind a Slack channel from this deployment',
    description:
      'Releases a channel binding owned by this deployment. Returns 404 if no explicit binding exists; 403 if owned by a different deployment.',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ channelId: z.string().max(32) }),
  }),
  handler: async ({ params, request, server }): Promise<SlackAppUnbindChannelResponse> => {
    try {
      await new SlackAppService(server).unbindChannel(request, params.path.channelId);
    } catch (error) {
      if (error instanceof RelayRequestError) throwRelayError(error);
      throw error;
    }
    return { status: 'unbound' };
  },
});

export const internalSlackAppRoutes = {
  ...connectSlackAppRoute,
  ...statusSlackAppRoute,
  ...disconnectSlackAppRoute,
  ...bindingsSlackAppRoute,
  ...bindChannelSlackAppRoute,
  ...unbindChannelSlackAppRoute,
};

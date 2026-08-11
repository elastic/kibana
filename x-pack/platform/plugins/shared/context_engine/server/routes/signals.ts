/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, RequestHandler } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import {
  DEFAULT_SIGNALS_PAGE_SIZE,
  MAX_SIGNAL_GROUPS,
  MAX_SIGNALS_PAGE_SIZE,
  SIGNALS_INTERNAL_API_VERSION,
  signalGroupsPath,
  signalsPath,
} from '../../common/constants';
import type { ListSignalGroupsResponse, ListSignalsResponse } from '../../common/http_api/signals';
import { apiPrivileges } from '../../common/features';
import { getSignalGroups, getSignalsByTag } from '../signals/read';

const READ_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.readContextEngine] },
};

const listSignalsQuerySchema = schema.object({
  tag: schema.string({
    minLength: 1,
    maxLength: 1024,
    meta: { description: 'The tag whose signals should be fetched.' },
  }),
  from: schema.number({ min: 0, defaultValue: 0 }),
  size: schema.number({
    min: 1,
    max: MAX_SIGNALS_PAGE_SIZE,
    defaultValue: DEFAULT_SIGNALS_PAGE_SIZE,
  }),
});

/**
 * Gates every Signals route on the Context Engine advanced setting, mirroring the AI index
 * routes. While the setting is off the routes 404 as if they did not exist.
 */
const withContextEngineFeatureFlag =
  <P, Q, B>(handler: RequestHandler<P, Q, B>): RequestHandler<P, Q, B> =>
  async (ctx, request, response) => {
    const { uiSettings } = await ctx.core;
    const isEnabled = await uiSettings.client.get<boolean>(CONTEXT_ENGINE_ENABLED_SETTING_ID);
    if (!isEnabled) {
      return response.notFound();
    }
    return handler(ctx, request, response);
  };

/**
 * Registers the read-only Signals routes. Reads run as the CURRENT USER (the signals indices are
 * per-space user indices), so both handlers use `asCurrentUser`.
 */
export const registerSignalRoutes = ({ router }: { router: IRouter }) => {
  // Preaggregated grouped-by-tag list.
  router.versioned
    .get({
      path: signalGroupsPath,
      security: READ_SECURITY,
      access: 'internal',
      summary: 'List signal groups',
      description:
        'Returns the Context Engine signals grouped by tag: a terms aggregation over the whole signals store.',
    })
    .addVersion(
      { version: SIGNALS_INTERNAL_API_VERSION, validate: false },
      withContextEngineFeatureFlag(async (ctx, _request, response) => {
        const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;
        const body: ListSignalGroupsResponse = await getSignalGroups(esClient, {
          maxGroups: MAX_SIGNAL_GROUPS,
        });
        return response.ok({ body });
      })
    );

  // Per-group signals (paginated).
  router.versioned
    .get({
      path: signalsPath,
      security: READ_SECURITY,
      access: 'internal',
      summary: 'List signals for a tag',
      description:
        'Returns the individual signals carrying a given tag, newest first and paginated.',
    })
    .addVersion(
      {
        version: SIGNALS_INTERNAL_API_VERSION,
        validate: { request: { query: listSignalsQuerySchema } },
      },
      withContextEngineFeatureFlag(async (ctx, request, response) => {
        const esClient = (await ctx.core).elasticsearch.client.asCurrentUser;
        const { tag, from, size } = request.query;
        const body: ListSignalsResponse = await getSignalsByTag(esClient, { tag, from, size });
        return response.ok({ body });
      })
    );
};

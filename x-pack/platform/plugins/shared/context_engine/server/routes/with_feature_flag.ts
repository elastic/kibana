/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import { CONTEXT_ENGINE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';

export const MEMORY_DISABLED_MESSAGE = 'Context Engine memory is turned off.';

export const CONTEXT_ENGINE_DOCS_NOTE =
  '**For more information, refer to the [Context Engine documentation](https://www.elastic.co/docs/explore-analyze/ai-features/context-engine).**';

/**
 * Gates a Context Engine route on the Context Engine advanced setting. While the setting is off the
 * route 404s as if it did not exist.
 */
export const withContextEngineFeatureFlag =
  <P, Q, B>(handler: RequestHandler<P, Q, B>): RequestHandler<P, Q, B> =>
  async (ctx, request, response) => {
    const { uiSettings } = await ctx.core;
    // Registered by the agent_builder_sml plugin (server/ui_settings.ts).
    const isEnabled = await uiSettings.client.get<boolean>(CONTEXT_ENGINE_ENABLED_SETTING_ID);
    if (!isEnabled) {
      return response.notFound({ body: { message: 'Not Found' } });
    }
    return handler(ctx, request, response);
  };

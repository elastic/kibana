/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type { RouteSecurity } from '@kbn/core-http-server';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { apiPrivileges } from '../../common/features';

export const READ_SECURITY: RouteSecurity = {
  authz: { requiredPrivileges: [apiPrivileges.readAgentBuilderSml] },
};

export const withSmlFeatureFlag =
  <P, Q, B>(handler: RequestHandler<P, Q, B>): RequestHandler<P, Q, B> =>
  async (ctx, request, response) => {
    const { uiSettings } = await ctx.core;
    const isEnabled = await uiSettings.client.get<boolean>(
      AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID
    );
    if (!isEnabled) {
      return response.notFound();
    }
    return handler(ctx, request, response);
  };

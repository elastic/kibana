/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaResponseFactory, RequestHandler, RouteMethod } from '@kbn/core/server';
import { AGENT_BUILDER_UIAM_OAUTH_CLIENT_MANAGEMENT_SETTING_ID } from '@kbn/management-settings-ids';

import type { SecurityRequestHandlerContext } from '../../types';

/**
 * Wraps an OAuth route handler so that requests return a `404 Not Found` when the
 * `agentBuilder:uiamOAuthClientManagement` uiSetting resolves to `false`.
 */
export const withOAuthManagementGate = <
  Params,
  Query,
  Body,
  Context extends SecurityRequestHandlerContext,
  Method extends RouteMethod,
  ResponseFactory extends KibanaResponseFactory
>(
  handler: RequestHandler<Params, Query, Body, Context, Method, ResponseFactory>
): RequestHandler<Params, Query, Body, Context, Method, ResponseFactory> => {
  return async (context, request, response) => {
    const { uiSettings } = await context.core;
    const enabled = await uiSettings.client.get<boolean>(
      AGENT_BUILDER_UIAM_OAUTH_CLIENT_MANAGEMENT_SETTING_ID
    );
    if (!enabled) {
      return response.notFound();
    }

    return handler(context, request, response);
  };
};

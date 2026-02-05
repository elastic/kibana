/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, RequestHandler } from '@kbn/core/server';
import { isAgentBuilderError } from '@kbn/agent-builder-common';
import { isValidLicense } from '../../common/license';
import type { AgentBuilderHandlerContext } from '../request_handler_context';

export interface RouteWrapConfig {
  /**
   * The feature flag to gate this route behind.
   * Defaults to false (no feature flag gating).
   */
  featureFlag?: string | false;
  /**
   * If true, will not check license level
   */
  ignoreLicense?: boolean;
}

export const getHandlerWrapper =
  ({ logger }: { logger: Logger }) =>
  <P, Q, B, Context extends AgentBuilderHandlerContext>(
    handler: RequestHandler<P, Q, B, Context>,
    { featureFlag = false, ignoreLicense = false }: RouteWrapConfig = {}
  ): RequestHandler<P, Q, B, Context> => {
    return async (ctx, req, res) => {
      if (featureFlag !== false) {
        const { uiSettings } = await ctx.core;
        const enabled = await uiSettings.client.get(featureFlag);
        if (!enabled) {
          return res.notFound();
        }
      }

      if (!ignoreLicense) {
        const { license } = await ctx.licensing;
        if (!isValidLicense(license)) {
          return res.forbidden({
            body: {
              message:
                'Invalid license level. Agent Builder APIs require an Enterprise license or higher.',
            },
          });
        }
      }

      try {
        return await handler(ctx, req, res);
      } catch (e) {
        if (isAgentBuilderError(e)) {
          logger.error(e);
          return res.customError({
            body: {
              message: e.message,
              attributes: {
                trace_id: e.meta?.traceId,
              },
            },
            statusCode: e.meta?.statusCode ?? 500,
          });
        } else {
          logger.error(`Unexpected error in handler: ${e.stack ?? e.message}`);
          return res.customError({
            body: {
              message: e.message ?? 'An unexpected error occurred',
            },
            statusCode: 500,
          });
        }
      }
    };
  };

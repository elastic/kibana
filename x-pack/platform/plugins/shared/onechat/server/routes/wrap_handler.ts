/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, RequestHandler } from '@kbn/core/server';
import { isOnechatError } from '@kbn/onechat-common';
import { ONECHAT_API_SETTING_ID } from '../../common/constants';

export interface RouteWrapConfig {
  /**
   * The feature flag to gate this route behind.
   * Defaults to {ONECHAT_API_SETTING_ID}
   */
  featureFlag?: string | false;
}

export const getHandlerWrapper =
  ({ logger }: { logger: Logger }) =>
  <P, Q, B>(
    handler: RequestHandler<P, Q, B>,
    { featureFlag = ONECHAT_API_SETTING_ID }: RouteWrapConfig = {}
  ): RequestHandler<P, Q, B> => {
    return async (ctx, req, res) => {
      if (featureFlag !== false) {
        const { uiSettings } = await ctx.core;
        const enabled = await uiSettings.client.get(featureFlag);
        if (!enabled) {
          return res.notFound();
        }
      }
      try {
        return await handler(ctx, req, res);
      } catch (e) {
        if (isOnechatError(e)) {
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

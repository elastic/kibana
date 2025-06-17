/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, RequestHandler } from '@kbn/core/server';
import { isOnechatError } from '@kbn/onechat-common';

export const getHandlerWrapper =
  ({ logger }: { logger: Logger }) =>
  <P, Q, B>(handler: RequestHandler<P, Q, B>): RequestHandler<P, Q, B> => {
    return (ctx, req, res) => {
      try {
        return handler(ctx, req, res);
      } catch (e) {
        if (isOnechatError(e)) {
          logger.error(e);
          return res.customError({
            body: { message: e.message },
            statusCode: e.meta?.statusCode ?? 500,
          });
        } else {
          throw e;
        }
      }
    };
  };

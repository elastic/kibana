/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Middleware } from '.';

/**
 * Gates routes that only make sense when the two extraction processes exist. With the flag off
 * there is no priority/nonPriority distinction, so the route is not served at all rather than
 * served with a meaningless process parameter.
 */
export const dualProcessEnabledMiddleware: Middleware = async (ctx, _req, res) => {
  const entityStoreCtx = await ctx.entityStore;
  const enabled = await entityStoreCtx.isDualProcessEnabled();

  if (!enabled) {
    return res.notFound({
      body: { message: 'Dual-process log extraction is not enabled' },
    });
  }
};

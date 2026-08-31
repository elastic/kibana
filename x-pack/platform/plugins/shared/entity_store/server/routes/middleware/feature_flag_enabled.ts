/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Middleware } from '.';

export const featureFlagEnabledMiddleware: Middleware = async (ctx, _req, res) => {
  const entityStoreCtx = await ctx.entityStore;
  const logger = entityStoreCtx.logger.get('featureFlagMiddleware');
  const isEntityStoreV2Enabled = await entityStoreCtx.featureFlags.isEntityStoreV2Enabled();

  if (!isEntityStoreV2Enabled) {
    logger.warn('Entity store v2 not enabled (feature flag not enabled)');
    return res.customError({
      statusCode: 403,
      body: {
        message: 'Entity store v2 not enabled (feature flag not enabled)',
      },
    });
  }
};

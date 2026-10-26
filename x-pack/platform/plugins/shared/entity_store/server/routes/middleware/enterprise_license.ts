/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Middleware } from '.';

const ENTITY_RESOLUTION_LICENSE_MESSAGE = 'Entity Resolution requires an Enterprise license';

export const enterpriseLicenseMiddleware: Middleware = async (ctx, _req, res) => {
  const { license } = await ctx.licensing;

  if (!license.hasAtLeast('enterprise')) {
    return res.forbidden({
      body: {
        message: ENTITY_RESOLUTION_LICENSE_MESSAGE,
      },
    });
  }
};

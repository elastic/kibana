/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { validateSslCertPath } from '../../../common/services';

export function throwIfSslPathInvalid(
  paths: Array<string | Record<string, unknown> | undefined | null>
) {
  for (const p of paths) {
    // SOSecret values can be a plain string or a { id } secret reference — skip references
    if (!p || typeof p === 'object') continue;
    const err = validateSslCertPath(p);
    if (err) throw Boom.badRequest(err);
  }
}

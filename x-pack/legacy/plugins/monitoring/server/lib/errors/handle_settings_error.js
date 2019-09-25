/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { boomify } from '@hapi/boom';

export function handleSettingsError(err) {
  return boomify(err, { statusCode: err.statusCode });
}

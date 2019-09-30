/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LensServerOptions } from '../server_options';
import { initFieldsRoute } from './field_stats';
import { existingFieldsRoute } from './existing_fields';

export function setupRoutes(opts: LensServerOptions) {
  initFieldsRoute(opts);
  existingFieldsRoute(opts);
}

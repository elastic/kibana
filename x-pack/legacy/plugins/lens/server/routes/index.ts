/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/server';
import { existingFieldsRoute } from './existing_fields';
import { initFieldsRoute } from './field_stats';
import { LensServerOptions } from '../server_options';

export function setupRoutes(setup: CoreSetup, opts: LensServerOptions) {
  existingFieldsRoute(setup, opts);
  initFieldsRoute(setup);
}

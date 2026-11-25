/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeferredDataClientBundle } from './deferred_data_client_bundle';
import type { CreateDataClientDeps } from '../types';

export function createDataClientBundle(deps: CreateDataClientDeps): DeferredDataClientBundle {
  return new DeferredDataClientBundle(deps);
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { ReindexService } from './src/reindex_service';
export type { ReindexServicePublicSetup, ReindexServicePublicStart } from './types';

import { ReindexServerPublicPlugin } from './plugin';

export function plugin() {
  return new ReindexServerPublicPlugin();
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudPipelinesStore } from './storage';

export const seedCloudPipelines = (store: CloudPipelinesStore): void => {
  if (!store.isEmpty()) {
    return;
  }

  // No targetStreamName — the graph assembler will assign real root streams
  // at render time via round-robin fallback, so numbers always match real data.
  store.create({ name: 'EU West 1 OTLP' });
  store.create({ name: 'US East 1 OTLP' });
};

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

  store.create({ name: 'EU West 1 OTLP', targetStreamName: 'logs' });
  store.create({ name: 'US East 1 OTLP', targetStreamName: 'logs.app' });
};

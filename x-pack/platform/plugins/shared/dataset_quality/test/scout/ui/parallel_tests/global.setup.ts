/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook, tags } from '@kbn/scout';

import { deleteParallelSuiteResources } from '../fixtures/parallel_suite_cleanup';

globalSetupHook(
  'Delete leftovers from an interrupted run',
  {
    tag: [
      ...tags.stateful.classic,
      ...tags.serverless.observability.complete,
      ...tags.serverless.observability.logs_essentials,
    ],
  },
  async ({ esClient, log }) => {
    await deleteParallelSuiteResources(esClient, log);
  }
);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalSetupHook } from '@kbn/scout';
import { enableQueryStreams } from '../fixtures/query_stream_helpers';

globalSetupHook('Setup environment for streams tests', async ({ apiServices, kbnClient, log }) => {
  log.debug('[setup] Enabling streams...');
  await apiServices.streams.enable();
  log.debug('[setup] Enabling query streams...');
  await enableQueryStreams(kbnClient);
});

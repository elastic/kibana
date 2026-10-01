/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalTeardownHook } from '@kbn/scout';
import { disableQueryStreams } from '../fixtures/query_stream_helpers';

globalTeardownHook(
  'Teardown environment for streams tests',
  async ({ apiServices, kbnClient, log }) => {
    log.debug('[teardown] Disabling query streams...');
    await disableQueryStreams(kbnClient);
    log.debug('[teardown] Disabling streams...');
    await apiServices.streams.disable();
  }
);

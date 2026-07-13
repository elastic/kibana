/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { globalTeardownHook } from '@kbn/scout';
import { OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS } from '@kbn/management-settings-ids';
import { getStreamsTestApiService } from '../services/streams_api_service';

globalTeardownHook(
  'Teardown environment for Streams API tests',
  async ({ kbnClient, esClient, log, apiServices }) => {
    const streamsApi = getStreamsTestApiService({ kbnClient, esClient, log });

    log.debug('[teardown] Disabling significant events feature...');
    await kbnClient.uiSettings.unset(OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS);

    log.debug('[teardown] Reverting significant events availability feature flag...');
    await streamsApi.disableSignificantEventsAvailability();

    log.debug('[teardown] Disabling Streams...');
    await apiServices.streams.disable();
  }
);

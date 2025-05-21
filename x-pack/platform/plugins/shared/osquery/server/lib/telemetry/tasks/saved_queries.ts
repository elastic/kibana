/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { TELEMETRY_EBT_SAVED_QUERY_EVENT } from '../constants';
import { templateSavedQueries } from '../helpers';
import type { TelemetryEventsSender } from '../sender';
import type { TelemetryReceiver } from '../receiver';

export function createTelemetrySavedQueriesTaskConfig() {
  return {
    type: 'osquery:telemetry-saved-queries',
    title: 'Osquery Saved Queries Telemetry',
    interval: '24h',
    timeout: '10m',
    version: '1.1.0',
    runTask: async (
      taskId: string,
      logger: Logger,
      receiver: TelemetryReceiver,
      sender: TelemetryEventsSender
    ) => {
      const savedQueriesResponse = await receiver.fetchSavedQueries();

      if (!savedQueriesResponse?.total) {
        logger.debug('no saved queries found');

        return;
      }

      const prebuiltSavedQueryIds = await receiver.fetchPrebuiltSavedQueryIds();
      const savedQueriesJson = templateSavedQueries(
        savedQueriesResponse?.saved_objects,
        prebuiltSavedQueryIds
      );

      savedQueriesJson.forEach((savedQuery) => {
        sender.reportEvent(TELEMETRY_EBT_SAVED_QUERY_EVENT, savedQuery);
      });
    },
  };
}

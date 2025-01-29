/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { TELEMETRY_EBT_PACK_EVENT } from '../constants';
import { templatePacks } from '../helpers';
import type { TelemetryEventsSender } from '../sender';
import type { TelemetryReceiver } from '../receiver';

export function createTelemetryPacksTaskConfig() {
  return {
    type: 'osquery:telemetry-packs',
    title: 'Osquery Packs Telemetry',
    interval: '24h',
    timeout: '10m',
    version: '1.1.0',
    runTask: async (
      taskId: string,
      logger: Logger,
      receiver: TelemetryReceiver,
      sender: TelemetryEventsSender
    ) => {
      const packsResponse = await receiver.fetchPacks();

      if (!packsResponse?.total) {
        logger.debug('no packs found');

        return;
      }

      const packsJson = templatePacks(packsResponse?.saved_objects);

      packsJson.forEach((pack) => {
        sender.reportEvent(TELEMETRY_EBT_PACK_EVENT, pack);
      });
    },
  };
}

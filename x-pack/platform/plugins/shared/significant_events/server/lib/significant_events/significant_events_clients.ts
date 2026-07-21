/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { DataStreamClient } from '@kbn/data-streams';
import type { AnyDataStreamDefinition } from '@kbn/data-streams';
import { DetectionService, detectionsDataStream } from './detections';
import type { DetectionClient } from './detections';
import { DiscoveryService, discoveriesDataStream } from './discoveries';
import type { DiscoveryClient } from './discoveries';
import { EventService, eventsDataStream } from './events';
import type { EventClient } from './events';
import { memoriesDataStream } from '../../memory_and_investigation/lib/memory';
import { memoryHistoryDataStream } from '../../memory_and_investigation/lib/memory/history_data_stream';

export interface SignificantEventsServices {
  detection: DetectionService;
  discovery: DiscoveryService;
  event: EventService;
}

export interface SignificantEventsClients {
  getDetectionClient: () => DetectionClient;
  getDiscoveryClient: () => DiscoveryClient;
  getEventClient: () => EventClient;
}

const SIGNIFICANT_EVENTS_DATA_STREAMS: AnyDataStreamDefinition[] = [
  detectionsDataStream,
  discoveriesDataStream,
  eventsDataStream,
  memoriesDataStream,
  memoryHistoryDataStream,
];

export function createSignificantEventsServices(): SignificantEventsServices {
  return {
    detection: new DetectionService(),
    discovery: new DiscoveryService(),
    event: new EventService(),
  };
}

export function createSignificantEventsClients({
  services,
  esClient,
  space,
}: {
  services: SignificantEventsServices;
  esClient: ElasticsearchClient;
  space: string;
}): SignificantEventsClients {
  return {
    getDetectionClient: () => services.detection.getClient({ esClient, space }),
    getDiscoveryClient: () => services.discovery.getClient({ esClient, space }),
    getEventClient: () => services.event.getClient({ esClient, space }),
  };
}

export async function initializeSignificantEventsTemplates({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<void> {
  // Attempt every template, then reject with an aggregate naming each failed one. Swallowing the
  // errors here would make the caller's install aggregate report success even when a template failed.
  const results = await Promise.allSettled(
    SIGNIFICANT_EVENTS_DATA_STREAMS.map((definition) =>
      DataStreamClient.initializeTemplate({
        dataStream: definition,
        elasticsearchClient: esClient,
        logger,
      })
    )
  );

  const failures = results.flatMap((result, index) =>
    result.status === 'rejected'
      ? [
          `${SIGNIFICANT_EVENTS_DATA_STREAMS[index].name} (${
            result.reason instanceof Error ? result.reason.message : String(result.reason)
          })`,
        ]
      : []
  );

  if (failures.length > 0) {
    throw new Error(`Failed to initialize significant events templates: [${failures.join('; ')}]`);
  }
}

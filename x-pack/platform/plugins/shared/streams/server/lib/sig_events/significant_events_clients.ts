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
import { VerdictService, verdictsDataStream } from './verdicts';
import type { VerdictClient } from './verdicts';

export interface SignificantEventsServices {
  detection: DetectionService;
  discovery: DiscoveryService;
  event: EventService;
  verdict: VerdictService;
}

export interface SignificantEventsClients {
  getDetectionClient: () => Promise<DetectionClient>;
  getDiscoveryClient: () => Promise<DiscoveryClient>;
  getEventClient: () => Promise<EventClient>;
  getVerdictClient: () => Promise<VerdictClient>;
}

const SIGNIFICANT_EVENTS_DATA_STREAMS: AnyDataStreamDefinition[] = [
  detectionsDataStream,
  discoveriesDataStream,
  eventsDataStream,
  verdictsDataStream,
];

export function createSignificantEventsServices(logger: Logger): SignificantEventsServices {
  return {
    detection: new DetectionService(logger),
    discovery: new DiscoveryService(logger),
    event: new EventService(logger),
    verdict: new VerdictService(logger),
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
    getVerdictClient: () => services.verdict.getClient({ esClient, space }),
  };
}

export async function initializeSignificantEventsTemplates({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<void> {
  await Promise.all(
    SIGNIFICANT_EVENTS_DATA_STREAMS.map(async (definition) => {
      try {
        await DataStreamClient.initialize({
          dataStream: definition,
          elasticsearchClient: esClient,
          logger,
        });
      } catch (error) {
        logger.info(
          `Failed to initialize template for ${definition.name}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    })
  );
}

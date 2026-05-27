/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AnyDataStreamDefinition } from '@kbn/data-streams';
import { DataStreamClient } from '@kbn/data-streams';
import { detectionsDataStream, DetectionsService } from './detections';
import type { DetectionsClient } from './detections';
import { discoveriesDataStream, DiscoveriesService } from './discoveries';
import type { DiscoveriesClient } from './discoveries';
import { eventsDataStream, EventsService } from './events';
import type { EventsClient } from './events';
import { verdictsDataStream, VerdictsService } from './verdicts';
import type { VerdictsClient } from './verdicts';

export interface SignificantEventsServices {
  detection: DetectionsService;
  discovery: DiscoveriesService;
  event: EventsService;
  verdict: VerdictsService;
}

export interface SignificantEventsClients {
  getDetectionClient: () => DetectionsClient;
  getDiscoveryClient: () => DiscoveriesClient;
  getEventClient: () => EventsClient;
  getVerdictClient: () => VerdictsClient;
}

const SIGNIFICANT_EVENTS_DATA_STREAMS: AnyDataStreamDefinition[] = [
  detectionsDataStream,
  discoveriesDataStream,
  eventsDataStream,
  verdictsDataStream,
];

export function createSignificantEventsServices(): SignificantEventsServices {
  return {
    detection: new DetectionsService(),
    discovery: new DiscoveriesService(),
    event: new EventsService(),
    verdict: new VerdictsService(),
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
        await DataStreamClient.initializeTemplate({
          dataStream: definition,
          elasticsearchClient: esClient,
          logger,
        });
      } catch (error) {
        logger.error(
          `Failed to initialize template for ${definition.name}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    })
  );
}

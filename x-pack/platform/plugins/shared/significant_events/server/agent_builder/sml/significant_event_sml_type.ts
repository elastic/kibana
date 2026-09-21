/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SmlEntry, SmlTypeDefinition } from '@kbn/agent-builder-sml-plugin/server';
import { getSmlOriginId, kibanaPermissions } from '@kbn/agent-builder-sml-plugin/server';
import { type SignificantEvent } from '@kbn/significant-events-schema';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { DataStreamsStart } from '@kbn/core-data-streams-server';
import { SIGNIFICANT_EVENT_KI_TYPE } from '@kbn/agent-builder-elastic-ai-index-ki-types';
import { SIGNIFICANT_EVENT_ATTACHMENT_TYPE } from '../../../common';
import {
  EventService,
  eventsDataStream,
  type eventsMappings,
  type StoredEvent,
} from '../../lib/significant_events/events';
import type { GetScopedClients } from '../../routes/types';

interface CreateSignificantEventSmlTypeOptions {
  getScopedClients: GetScopedClients;
  getDataStreams: () => Promise<DataStreamsStart>;
  isAvailable: () => Promise<boolean>;
}

const PAGE_SIZE = 100;

const eventToSmlContent = (event: SignificantEvent): string => {
  return [
    event.title,
    event.symptom_hypothesis,
    event.summary,
    `status: ${event.status}`,
    `severity: ${event.severity}`,
    `confidence: ${event.confidence}`,
    `streams: ${event.stream_names.join(', ')}`,
  ]
    .filter((part): part is string => Boolean(part))
    .join('\n');
};

export const createSignificantEventSmlType = ({
  getScopedClients,
  getDataStreams,
  isAvailable,
}: CreateSignificantEventSmlTypeOptions): SmlTypeDefinition => {
  const eventService = new EventService();
  const getSmlEventClient = async (esClient: ElasticsearchClient) => {
    if (!(await isAvailable())) {
      return;
    }

    const dataStreams = await getDataStreams();
    const dataStreamClient = await dataStreams.initializeClient<typeof eventsMappings, StoredEvent>(
      eventsDataStream.name
    );

    return eventService.getClient({ dataStreamClient, esClient, space: DEFAULT_SPACE_ID });
  };

  return {
    id: SIGNIFICANT_EVENT_KI_TYPE,
    fetchFrequency: () => '10m',

    async *list(context) {
      let page = 1;

      try {
        const eventClient = await getSmlEventClient(context.esClient);
        if (!eventClient) {
          return;
        }
        while (true) {
          const { hits } = await eventClient.findLatestPaginated({ page, perPage: PAGE_SIZE });

          if (hits.length === 0) {
            return;
          }

          yield hits.map((event) => ({
            id: event.event_id,
            updatedAt: event['@timestamp'],
            spaces: ['*'],
          }));

          if (hits.length < PAGE_SIZE) {
            return;
          }
          page++;
        }
      } catch (error) {
        context.logger.warn(
          `SML significant event: failed to list events: ${(error as Error).message}`
        );
        return;
      }
    },

    getSmlEntry: async (originId, context): Promise<SmlEntry | undefined> => {
      try {
        const eventClient = await getSmlEventClient(context.esClient);
        if (!eventClient) {
          return undefined;
        }
        const { hits } = await eventClient.findByEventId(originId);
        const event = hits.at(-1);

        if (!event) {
          return undefined;
        }

        return {
          type: SIGNIFICANT_EVENT_KI_TYPE,
          title: event.title,
          content: eventToSmlContent(event),
        };
      } catch (error) {
        context.logger.warn(
          `SML significant event: failed to get data for '${originId}': ${(error as Error).message}`
        );
        return undefined;
      }
    },

    getPermissions: () => kibanaPermissions({ kiType: SIGNIFICANT_EVENT_KI_TYPE }),

    toAttachment: async (item, context) => {
      if (!(await isAvailable())) {
        return undefined;
      }

      const originId = getSmlOriginId(item);
      if (!originId) {
        return undefined;
      }
      const { getEventClient } = await getScopedClients({ request: context.request });
      const eventClient = await getEventClient();
      const { hits } = await eventClient.findByEventId(originId);
      const event = hits.at(-1);

      if (!event) {
        return undefined;
      }

      return {
        type: SIGNIFICANT_EVENT_ATTACHMENT_TYPE,
        origin: event.event_id,
        data: event,
      };
    },
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltInAgentDefinition } from '@kbn/agent-builder-server/agents';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import { getSignificantEventsAvailability } from '../../../routes/utils/assert_significant_events_access';
import instructions from './instructions/discovery.md.text';
import { SIGNIFICANT_EVENTS_DISCOVERY_TOOL_IDS } from './constants';

export const SIGNIFICANT_EVENTS_INVESTIGATOR_AGENT_ID = 'platform.streams.sig-events.discovery';

export function createSignificantEventsDiscoveryAgent({
  server,
}: {
  server: StreamsServer;
}): BuiltInAgentDefinition {
  return {
    id: SIGNIFICANT_EVENTS_INVESTIGATOR_AGENT_ID,
    name: 'Significant Events Discovery',
    description:
      'Triages statistical detection signals across rules, correlates related detections into incident candidates using shared infrastructure, temporal proximity, and causal plausibility, and drafts structured discovery documents with root-cause hypotheses and supporting evidence.',
    labels: ['observability', 'streams', 'significant-events', 'discovery'],
    avatar_icon: 'logoElastic',
    availability: {
      cacheMode: 'space',
      handler: async (context) => {
        const availability = await getSignificantEventsAvailability({
          server,
          licensing: server.licensing,
          uiSettingsClient: context.uiSettings,
        });

        return availability.available
          ? { status: 'available' }
          : { status: 'unavailable', reason: availability.reason };
      },
    },
    configuration: {
      instructions,
      tools: [
        {
          tool_ids: [...SIGNIFICANT_EVENTS_DISCOVERY_TOOL_IDS],
        },
      ],
    },
  } as const;
}

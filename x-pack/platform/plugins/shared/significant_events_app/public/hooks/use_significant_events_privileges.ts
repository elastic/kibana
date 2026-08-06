/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { STREAMS_UI_PRIVILEGES } from '@kbn/streams-plugin/public';
import { useKibana } from './use_kibana';
import { useSignificantEventsAvailability } from './use_significant_events_availability';

export type SignificantEventsPrivileges = ReturnType<typeof useSignificantEventsPrivileges>;

export function useSignificantEventsPrivileges() {
  const {
    core: {
      application: {
        capabilities: { streams },
      },
    },
  } = useKibana();

  // Availability comes from the server endpoint (the single source of truth,
  // covering the rollout flag, project type, pricing tier, license and required
  // plugins). The query is cached, so multiple callers share one request.
  const { availability, isLoading } = useSignificantEventsAvailability();

  return {
    /**
     * Streams UI capabilities: the Significant Events UI manages queries attached to
     * streams, so write actions are gated by the streams `manage` privilege.
     */
    ui: streams as {
      [STREAMS_UI_PRIVILEGES.manage]: boolean;
      [STREAMS_UI_PRIVILEGES.show]: boolean;
    },
    significantEvents: {
      available: availability?.available ?? false,
    },
    isLoading,
  };
}

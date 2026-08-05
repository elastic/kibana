/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { HttpSetup, IUiSettingsClient } from '@kbn/core/public';
import {
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_INTERVAL_MINUTES,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_TARGET_COVERAGE_MINUTES,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_REVIEW_INTERVAL_MINUTES,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DISCOVERY_BATCH_SIZE,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_TRIAGE_BATCH_SIZE,
  OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_MAX_REVIEW_PASSES,
} from '@kbn/management-settings-ids';
import {
  DEFAULT_SIG_EVENTS_SCHEDULED_DETECTION_INTERVAL_MINUTES,
  DEFAULT_SIG_EVENTS_SCHEDULED_DISCOVERY_BATCH_SIZE,
  DEFAULT_SIG_EVENTS_SCHEDULED_MAX_REVIEW_PASSES,
  DEFAULT_SIG_EVENTS_SCHEDULED_REVIEW_INTERVAL_MINUTES,
  DEFAULT_SIG_EVENTS_SCHEDULED_TRIAGE_BATCH_SIZE,
  DEFAULT_SIG_EVENTS_TARGET_COVERAGE_MINUTES,
} from '@kbn/significant-events-plugin/common';

export interface ScheduledDiscoveryState {
  enabled: boolean;
  detectionIntervalMinutes: number;
  targetCoverageMinutes: number;
  reviewIntervalMinutes: number;
  discoveryBatchSize: number;
  triageBatchSize: number;
  maxReviewPasses: number;
}

const readSettingsFromClient = (client: IUiSettingsClient): ScheduledDiscoveryState => ({
  enabled: client.get<boolean>(
    OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
    false
  ),
  detectionIntervalMinutes: client.get<number>(
    OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_INTERVAL_MINUTES,
    DEFAULT_SIG_EVENTS_SCHEDULED_DETECTION_INTERVAL_MINUTES
  ),
  targetCoverageMinutes: client.get<number>(
    OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_TARGET_COVERAGE_MINUTES,
    DEFAULT_SIG_EVENTS_TARGET_COVERAGE_MINUTES
  ),
  reviewIntervalMinutes: client.get<number>(
    OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_REVIEW_INTERVAL_MINUTES,
    DEFAULT_SIG_EVENTS_SCHEDULED_REVIEW_INTERVAL_MINUTES
  ),
  discoveryBatchSize: client.get<number>(
    OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DISCOVERY_BATCH_SIZE,
    DEFAULT_SIG_EVENTS_SCHEDULED_DISCOVERY_BATCH_SIZE
  ),
  triageBatchSize: client.get<number>(
    OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_TRIAGE_BATCH_SIZE,
    DEFAULT_SIG_EVENTS_SCHEDULED_TRIAGE_BATCH_SIZE
  ),
  maxReviewPasses: client.get<number>(
    OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_MAX_REVIEW_PASSES,
    DEFAULT_SIG_EVENTS_SCHEDULED_MAX_REVIEW_PASSES
  ),
});

export const useScheduledDiscoverySettings = ({
  client,
  http,
}: {
  client: IUiSettingsClient;
  http: HttpSetup;
}) => {
  const [saved, setSaved] = useState<ScheduledDiscoveryState>(() => readSettingsFromClient(client));
  const [draft, setDraft] = useState<ScheduledDiscoveryState>(saved);

  const hasChanged = useMemo(
    () =>
      draft.enabled !== saved.enabled ||
      draft.detectionIntervalMinutes !== saved.detectionIntervalMinutes ||
      draft.targetCoverageMinutes !== saved.targetCoverageMinutes ||
      draft.reviewIntervalMinutes !== saved.reviewIntervalMinutes ||
      draft.discoveryBatchSize !== saved.discoveryBatchSize ||
      draft.triageBatchSize !== saved.triageBatchSize ||
      draft.maxReviewPasses !== saved.maxReviewPasses,
    [draft, saved]
  );

  const reset = useCallback(() => {
    setDraft(saved);
  }, [saved]);

  const save = useCallback(async () => {
    await http.put('/internal/streams/_significant_events/scheduled_discovery/settings', {
      body: JSON.stringify({ scheduledDiscovery: draft }),
    });

    await Promise.all([
      client.set(
        OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED,
        draft.enabled
      ),
      client.set(
        OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DETECTION_INTERVAL_MINUTES,
        draft.detectionIntervalMinutes
      ),
      client.set(
        OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_TARGET_COVERAGE_MINUTES,
        draft.targetCoverageMinutes
      ),
      client.set(
        OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_REVIEW_INTERVAL_MINUTES,
        draft.reviewIntervalMinutes
      ),
      client.set(
        OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_DISCOVERY_BATCH_SIZE,
        draft.discoveryBatchSize
      ),
      client.set(
        OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_TRIAGE_BATCH_SIZE,
        draft.triageBatchSize
      ),
      client.set(
        OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_MAX_REVIEW_PASSES,
        draft.maxReviewPasses
      ),
    ]);

    setSaved(draft);
  }, [client, http, draft]);

  return useMemo(
    () => ({ saved, draft, setDraft, hasChanged, reset, save }),
    [saved, draft, hasChanged, reset, save]
  );
};

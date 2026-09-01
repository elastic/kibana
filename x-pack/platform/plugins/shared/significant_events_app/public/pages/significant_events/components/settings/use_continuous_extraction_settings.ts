/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { HttpSetup, IUiSettingsClient } from '@kbn/core/public';
import {
  OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED,
  OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_INTERVAL_HOURS,
} from '@kbn/management-settings-ids';
import { DEFAULT_EXTRACTION_INTERVAL_HOURS } from '@kbn/significant-events-plugin/common';
import { useSyncEnabledFromStatus } from './use_sync_enabled_from_status';

export interface ContinuousExtractionState {
  enabled: boolean;
  intervalHours: number;
}

const readSettingsFromClient = (globalClient: IUiSettingsClient): ContinuousExtractionState => ({
  enabled: globalClient.get<boolean>(OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED, false),
  intervalHours: globalClient.get<number>(
    OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_INTERVAL_HOURS,
    DEFAULT_EXTRACTION_INTERVAL_HOURS
  ),
});

export const useContinuousExtractionSettings = ({
  globalClient,
  http,
  /** Live enabled flag from maintenance status (keeps UI in sync after pause/resume). */
  enabledFromStatus,
}: {
  globalClient: IUiSettingsClient;
  http: HttpSetup;
  enabledFromStatus?: boolean;
}) => {
  const [saved, setSaved] = useState<ContinuousExtractionState>(() =>
    readSettingsFromClient(globalClient)
  );
  const [draft, setDraft] = useState<ContinuousExtractionState>(saved);

  useSyncEnabledFromStatus({
    client: globalClient,
    settingId: OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED,
    enabledFromStatus,
    setSaved,
    setDraft,
  });

  const hasChanged = useMemo(
    () => draft.enabled !== saved.enabled || draft.intervalHours !== saved.intervalHours,
    [draft, saved]
  );

  const reset = useCallback(() => {
    setDraft(saved);
  }, [saved]);

  const save = useCallback(async () => {
    await http.put('/internal/streams/_knowledge_indicators/continuous_ki_extraction/settings', {
      body: JSON.stringify({ continuousKiExtraction: draft }),
    });

    await Promise.all([
      globalClient.set(OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED, draft.enabled),
      globalClient.set(
        OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_INTERVAL_HOURS,
        draft.intervalHours
      ),
    ]);

    setSaved(draft);
  }, [globalClient, http, draft]);

  return useMemo(
    () => ({ saved, draft, setDraft, hasChanged, reset, save }),
    [saved, draft, hasChanged, reset, save]
  );
};

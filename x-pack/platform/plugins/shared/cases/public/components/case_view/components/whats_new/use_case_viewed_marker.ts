/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import { useKibana } from '../../../../common/lib/kibana';
import type { ViewedMarker } from './viewed_marker';
import { rollViewedMarker } from './viewed_marker';

const getStorageKey = (caseId: string) => `cases.deltaView.lastViewed.${caseId}`;

interface UseCaseViewedMarkerResult {
  /** Start of the delta window, or null on a first visit. */
  since: string | null;
  isDismissed: boolean;
  markSeen: () => void;
}

export const useCaseViewedMarker = (caseId: string): UseCaseViewedMarkerResult => {
  const {
    services: { storage },
  } = useKibana();
  const key = getStorageKey(caseId);

  const [marker] = useState<ViewedMarker>(() => rollViewedMarker(storage.get(key), new Date()));
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    storage.set(key, marker);
  }, [storage, key, marker]);

  const markSeen = useCallback(() => {
    storage.set(key, { lastViewedAt: new Date().toISOString(), previousViewedAt: null });
    setIsDismissed(true);
  }, [storage, key]);

  return { since: marker.previousViewedAt, isDismissed, markSeen };
};

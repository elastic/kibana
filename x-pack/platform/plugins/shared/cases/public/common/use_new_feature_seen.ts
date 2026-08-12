/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { useKibana } from './lib/kibana';

export interface UseNewFeatureSeenResult {
  /** Whether the feature is still "new" (the user hasn't dismissed the indicator yet). */
  isNew: boolean;
  /** Marks the feature as seen and persists it, so the indicator won't show again. */
  markSeen: () => void;
}

/**
 * Backs a lightweight "new feature" indicator (e.g. a dot or badge) with a persisted,
 * per-browser "seen" flag. Keys should be version-scoped (see NEW_FEATURE_STORAGE_KEYS) so a
 * future feature reusing the same surface can re-trigger the indicator with a new key.
 */
export const useNewFeatureSeen = (storageKey: string): UseNewFeatureSeenResult => {
  const {
    services: { storage },
  } = useKibana();

  const [seen, setSeen] = useState<boolean>(() => storage.get(storageKey) === true);

  const markSeen = useCallback(() => {
    setSeen((prev) => {
      if (!prev) {
        storage.set(storageKey, true);
      }
      return true;
    });
  }, [storage, storageKey]);

  return { isNew: !seen, markSeen };
};

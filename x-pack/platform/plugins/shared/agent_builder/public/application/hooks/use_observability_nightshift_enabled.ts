/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  OBSERVABILITY_NIGHTSHIFT_LOCAL_STORAGE_KEY,
  OBSERVABILITY_NIGHTSHIFT_SETTING_CHANGED,
  readObservabilityNightshiftEnabled,
  writeObservabilityNightshiftEnabled,
} from '../utils/observability_nightshift_setting';

export const useObservabilityNightshiftEnabled = (): readonly [boolean, (next: boolean) => void] => {
  const [enabled, setEnabled] = useState(() => readObservabilityNightshiftEnabled());

  useEffect(() => {
    const onCustom = () => {
      setEnabled(readObservabilityNightshiftEnabled());
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === OBSERVABILITY_NIGHTSHIFT_LOCAL_STORAGE_KEY) {
        setEnabled(readObservabilityNightshiftEnabled());
      }
    };
    window.addEventListener(OBSERVABILITY_NIGHTSHIFT_SETTING_CHANGED, onCustom);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(OBSERVABILITY_NIGHTSHIFT_SETTING_CHANGED, onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const setNightshiftEnabled = useCallback((next: boolean) => {
    writeObservabilityNightshiftEnabled(next);
    setEnabled(next);
  }, []);

  return [enabled, setNightshiftEnabled] as const;
};

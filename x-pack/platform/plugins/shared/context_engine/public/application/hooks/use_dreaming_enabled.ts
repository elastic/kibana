/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONTEXT_ENGINE_DREAMING_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import { useEffect, useState } from 'react';
import { useKibana } from './use_kibana';
import { useMemoryEnabled } from './use_memory_enabled';

/** Whether the global memory and dreaming settings are both on. */
export const useDreamingEnabled = (): boolean => {
  const {
    services: { settings },
  } = useKibana();
  const isMemoryEnabled = useMemoryEnabled();

  const [enabled, setEnabled] = useState<boolean>(() =>
    settings.globalClient.get<boolean>(CONTEXT_ENGINE_DREAMING_ENABLED_SETTING_ID, false)
  );

  useEffect(() => {
    const subscription = settings.globalClient
      .get$<boolean>(CONTEXT_ENGINE_DREAMING_ENABLED_SETTING_ID, false)
      .subscribe(setEnabled);
    return () => subscription.unsubscribe();
  }, [settings]);

  return isMemoryEnabled && enabled;
};

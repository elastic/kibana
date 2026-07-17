/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { IUiSettingsClient } from '@kbn/core/public';

/**
 * Reconcile a settings hook's local `enabled` flag with the live value from
 * maintenance status (after pause/resume) and write it back to uiSettings.
 * No-op until `enabledFromStatus` is known.
 */
export const useSyncEnabledFromStatus = <T extends { enabled: boolean }>({
  client,
  settingId,
  enabledFromStatus,
  setSaved,
  setDraft,
}: {
  client: IUiSettingsClient;
  settingId: string;
  enabledFromStatus: boolean | undefined;
  setSaved: Dispatch<SetStateAction<T>>;
  setDraft: Dispatch<SetStateAction<T>>;
}): void => {
  useEffect(() => {
    if (enabledFromStatus === undefined) {
      return;
    }
    const syncEnabled = (previous: T): T =>
      previous.enabled === enabledFromStatus
        ? previous
        : { ...previous, enabled: enabledFromStatus };
    setSaved(syncEnabled);
    setDraft(syncEnabled);
    void client.set(settingId, enabledFromStatus);
  }, [enabledFromStatus, client, settingId, setSaved, setDraft]);
};

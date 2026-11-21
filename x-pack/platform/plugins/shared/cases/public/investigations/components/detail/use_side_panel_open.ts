/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import { Storage } from '@kbn/kibana-utils-plugin/public';

export const SIDE_PANEL_STORAGE_KEY = 'xpack.cases.investigations.sidePanelOpen';

/** Whether the side panel is open, remembered in local storage. Open by default. */
export const useSidePanelOpen = (): [boolean, (open: boolean) => void] => {
  const storage = useMemo(() => new Storage(window.localStorage), []);
  const [open, setOpenState] = useState<boolean>(
    () => storage.get(SIDE_PANEL_STORAGE_KEY) !== false
  );

  const setOpen = useCallback(
    (next: boolean) => {
      setOpenState(next);
      storage.set(SIDE_PANEL_STORAGE_KEY, next);
    },
    [storage]
  );

  return [open, setOpen];
};

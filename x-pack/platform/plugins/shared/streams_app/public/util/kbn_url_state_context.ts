/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createKbnUrlStateStorage, withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';
import { syncGlobalQueryStateWithUrl } from '@kbn/data-plugin/public';
import createContainer from 'constate';
import { useState, useEffect, useRef } from 'react';
import { useKibana } from '../hooks/use_kibana';

/**
 * Extracts the _g (global state) parameter from a URL search string
 */
const extractGlobalState = (search: string): string | null => {
  const params = new URLSearchParams(search);
  return params.get('_g');
};

const useKbnUrlStateStorageFromRouter = () => {
  const {
    appParams: { history },
    core: {
      notifications: { toasts },
      uiSettings,
    },
    dependencies: {
      start: { data },
    },
  } = useKibana();

  // Track the last known _g value to restore it when Chrome nav strips it
  const lastGlobalStateRef = useRef<string | null>(
    extractGlobalState(history.location.search || '')
  );

  // Create URL state storage and sync global query state synchronously
  // This ensures state is ready before any child components render
  const [{ urlStateStorage, stopSync }] = useState(() => {
    const storage = createKbnUrlStateStorage({
      history,
      useHash: uiSettings.get('state:storeInSessionStorage'),
      useHashQuery: false,
      ...withNotifyOnErrors(toasts),
    });

    // Sync _g with URL:
    // 1. Reads _g from URL and applies to timefilter on mount
    // 2. If no _g in URL, writes in-memory timefilter state to URL
    // 3. Sets up two-way sync for ongoing changes
    const { stop } = syncGlobalQueryStateWithUrl(data.query, storage);

    return { urlStateStorage: storage, stopSync: stop };
  });

  // Handle in-app navigation where Chrome nav may strip _g
  // (e.g., clicking Streams nav button from within Streams app)
  useEffect(() => {
    const unlisten = history.listen((location) => {
      const currentGlobalState = extractGlobalState(location.search || '');

      // If navigation removed _g but we had it before, restore it
      if (!currentGlobalState && lastGlobalStateRef.current) {
        const params = new URLSearchParams(location.search || '');
        params.set('_g', lastGlobalStateRef.current);
        history.replace({ ...location, search: `?${params.toString()}` });
      } else if (currentGlobalState) {
        // Track the latest _g value
        lastGlobalStateRef.current = currentGlobalState;
      }
    });

    return () => {
      unlisten();
      stopSync();
    };
  }, [history, stopSync]);

  return urlStateStorage;
};

export const [KbnUrlStateStorageFromRouterProvider, useKbnUrlStateStorageFromRouterContext] =
  createContainer(useKbnUrlStateStorageFromRouter);

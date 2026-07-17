/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import type { EpisodesSortState } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import deepEqual from 'fast-deep-equal';
import {
  DEFAULT_EPISODES_TABLE_CONFIG,
  type EpisodesTableConfig,
  mergeEpisodesTableConfig,
  readEpisodesTableConfigFromStorage,
  readEpisodesTableConfigFromUrl,
  writeEpisodesTableConfigToStorage,
  writeEpisodesTableConfigToUrl,
} from '../utils/episodes_table_config';

/**
 * Persists episode table display options (columns, sort, row height, column widths) to both
 * the URL (`_a.episodesTable`) and localStorage, so they survive reloads and are shareable via URL.
 *
 * Precedence on load (and on re-sync from browser Back/Forward): URL > localStorage > default.
 * Every setter writes to both stores, so the two stay in sync going forward.
 */
export const useEpisodesTableConfig = (storage: Storage) => {
  const history = useHistory();
  const location = useLocation();

  const urlStateStorage = useMemo(
    () =>
      createKbnUrlStateStorage({
        history,
        useHash: false,
        useHashQuery: false,
      }),
    [history]
  );

  const [config, setConfigInternal] = useState<EpisodesTableConfig>(() =>
    mergeEpisodesTableConfig(
      readEpisodesTableConfigFromStorage(storage),
      readEpisodesTableConfigFromUrl(urlStateStorage)
    )
  );

  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    // useState above only reads the URL on mount; user-driven changes go through setRowHeight.
    // When location.search changes without that (e.g. browser Back/Forward), we must re-apply the
    // state here or the table will diverge from the address bar. Mirrors useEpisodesListUrlState.
    const next = mergeEpisodesTableConfig(
      readEpisodesTableConfigFromStorage(storage),
      readEpisodesTableConfigFromUrl(urlStateStorage)
    );
    setConfigInternal((prev) => (deepEqual(prev, next) ? prev : next));
  }, [location.search, storage, urlStateStorage]);

  const persistConfig = useCallback(
    async (next: EpisodesTableConfig) => {
      writeEpisodesTableConfigToStorage(storage, next);
      await writeEpisodesTableConfigToUrl(urlStateStorage, next);
    },
    [storage, urlStateStorage]
  );

  const setVisibleColumns = useCallback(
    (visibleColumns: string[]) => {
      const next: EpisodesTableConfig = { ...configRef.current, visibleColumns };
      setConfigInternal(next);
      void persistConfig(next);
    },
    [persistConfig]
  );

  const setSort = useCallback(
    (sort: EpisodesSortState) => {
      const next: EpisodesTableConfig = { ...configRef.current, sort };
      setConfigInternal(next);
      void persistConfig(next);
    },
    [persistConfig]
  );

  const setRowHeight = useCallback(
    (rowHeight: number) => {
      const next: EpisodesTableConfig = { ...configRef.current, rowHeight };
      setConfigInternal(next);
      void persistConfig(next);
    },
    [persistConfig]
  );

  const onResize = useCallback(
    ({ columnId, width }: { columnId: string; width: number | undefined }) => {
      const prevColumnSettings = configRef.current.columnSettings;
      const next: EpisodesTableConfig = {
        ...configRef.current,
        columnSettings: {
          ...prevColumnSettings,
          [columnId]: {
            ...prevColumnSettings[columnId],
            width,
          },
        },
      };
      setConfigInternal(next);
      void persistConfig(next);
    },
    [persistConfig]
  );

  const resetToDefaults = useCallback(() => {
    setConfigInternal(DEFAULT_EPISODES_TABLE_CONFIG);
    void persistConfig(DEFAULT_EPISODES_TABLE_CONFIG);
  }, [persistConfig]);

  return {
    visibleColumns: config.visibleColumns,
    sort: config.sort,
    rowHeight: config.rowHeight,
    columnSettings: config.columnSettings,
    setVisibleColumns,
    setSort,
    setRowHeight,
    onResize,
    resetToDefaults,
  };
};

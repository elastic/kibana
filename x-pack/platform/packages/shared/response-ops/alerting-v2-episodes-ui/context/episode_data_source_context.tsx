/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import type { EpisodeDataSource } from '../types/episode_data_source';

interface EpisodeDataSourceContextValue {
  dataSource?: EpisodeDataSource;
  queryV2Source: boolean;
}

const EpisodeDataSourceContext = createContext<EpisodeDataSourceContextValue>({
  queryV2Source: true,
});

export interface EpisodeDataSourceProviderProps {
  dataSource?: EpisodeDataSource;
  /**
   * Whether to query the v2 episodes source. Hosts derive this from the user's
   * `alerting_v2_alerts` read capability; when `false`, only `dataSource` is queried.
   */
  queryV2Source?: boolean;
}

export const EpisodeDataSourceProvider = ({
  dataSource,
  queryV2Source = true,
  children,
}: PropsWithChildren<EpisodeDataSourceProviderProps>) => {
  const value = useMemo(() => ({ dataSource, queryV2Source }), [dataSource, queryV2Source]);
  return (
    <EpisodeDataSourceContext.Provider value={value}>{children}</EpisodeDataSourceContext.Provider>
  );
};

export const useAdditionalEpisodesDataSource = (): EpisodeDataSource | undefined =>
  useContext(EpisodeDataSourceContext).dataSource;

export const useQueryV2Source = (): boolean => useContext(EpisodeDataSourceContext).queryV2Source;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, type PropsWithChildren } from 'react';
import type { EpisodeDataSource } from '../types/episode_data_source';

const EpisodeDataSourceContext = createContext<EpisodeDataSource | undefined>(undefined);

export interface EpisodeDataSourceProviderProps {
  dataSource?: EpisodeDataSource;
}

export const EpisodeDataSourceProvider = ({
  dataSource,
  children,
}: PropsWithChildren<EpisodeDataSourceProviderProps>) => (
  <EpisodeDataSourceContext.Provider value={dataSource}>
    {children}
  </EpisodeDataSourceContext.Provider>
);

export const useAdditionalEpisodesDataSource = (): EpisodeDataSource | undefined =>
  useContext(EpisodeDataSourceContext);

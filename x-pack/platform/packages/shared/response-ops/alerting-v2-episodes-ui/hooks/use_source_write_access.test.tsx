/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type PropsWithChildren } from 'react';
import { renderHook } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { EpisodeDataSourceProvider } from '../context/episode_data_source_context';
import type { EpisodeDataSource } from '../types/episode_data_source';
import { useSourceWriteAccess } from './use_source_write_access';

const services = {
  application: applicationServiceMock.createStartContract(),
  http: httpServiceMock.createStartContract(),
  notifications: notificationServiceMock.createStartContract(),
};

const createSource = (useWriteAccess: EpisodeDataSource['useWriteAccess']): EpisodeDataSource => ({
  id: 'v1',
  label: 'Classic',
  queryKeyPrefix: ['v1'],
  fetchEpisodes: async () => [],
  useWriteAccess,
});

const renderWithSource = (dataSource?: EpisodeDataSource) => {
  const wrapper = ({ children }: PropsWithChildren) => (
    <EpisodeDataSourceProvider dataSource={dataSource}>{children}</EpisodeDataSourceProvider>
  );

  return renderHook(() => useSourceWriteAccess(services), { wrapper }).result.current;
};

describe('useSourceWriteAccess', () => {
  it('resolves nothing without a data source', () => {
    expect(renderWithSource()).toBeUndefined();
  });

  it('delegates to the source write access hook', () => {
    const useWriteAccess = jest.fn().mockReturnValue(() => true);
    const canWriteEpisode = renderWithSource(createSource(useWriteAccess));

    expect(useWriteAccess).toHaveBeenCalledWith(services);
    expect(canWriteEpisode).toBeDefined();
  });
});

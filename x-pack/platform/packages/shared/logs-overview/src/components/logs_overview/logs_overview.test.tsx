/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { themeServiceMock } from '@kbn/core-theme-browser-mocks';
import { settingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import { logsDataAccessPluginMock } from '@kbn/logs-data-access-plugin/public/mocks';
import { mlPluginMock } from '@kbn/ml-plugin/public/mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import '@testing-library/jest-dom';
import React from 'react';
import { type LogCategoriesDependencies } from '../log_categories';
import { type LogEventsDependencies } from '../log_events';
import {
  LogsOverview,
  type LogsOverviewDependencies,
  type LogsOverviewProps,
} from './logs_overview';

const commonDependencies = {
  dataViews: dataViewPluginMocks.createStartContract(),
  embeddable: embeddablePluginMock.createStartContract(),
  search: dataPluginMock.createStartContract().search.search,
  searchSource: dataPluginMock.createStartContract().search.searchSource,
  share: sharePluginMock.createStartContract(),
  theme: themeServiceMock.createStartContract(),
  uiSettings: settingsServiceMock.createStartContract(),
} satisfies Partial<LogsOverviewDependencies>;

const mockLogCategoriesDependencies: Omit<
  LogCategoriesDependencies,
  keyof typeof commonDependencies
> = {
  charts: chartPluginMock.createStartContract(),
};

const mockLogEventsDependencies: Omit<LogEventsDependencies, keyof typeof commonDependencies> = {};

const mockDependencies: LogsOverviewDependencies = {
  ...commonDependencies,
  ...mockLogCategoriesDependencies,
  ...mockLogEventsDependencies,
  logsDataAccess: logsDataAccessPluginMock.createStartContract(),
  mlApi: mlPluginMock.createStartContract().mlApi,
};

describe('LogsOverview', () => {
  const defaultProps: LogsOverviewProps = {
    dependencies: mockDependencies,
    height: 400,
    timeRange: { start: '2023-01-01T00:00:00Z', end: '2023-01-02T00:00:00Z' },
  };

  beforeAll(() => {
    jest
      .spyOn(mockDependencies.logsDataAccess.services.logSourcesService, 'getFlattenedLogSources')
      .mockResolvedValue('logs');
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('renders without crashing', async () => {
    const { findByTestId } = renderWithKibanaRenderContext(<LogsOverview {...defaultProps} />);

    expect(await findByTestId('logsOverviewLogEvents')).toBeInTheDocument();
  });
});

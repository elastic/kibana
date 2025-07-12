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
import { createStubDataView } from '@kbn/data-views-plugin/common/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import { logsDataAccessPluginMock } from '@kbn/logs-data-access-plugin/public/mocks';
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

// Mock the saved search since it relies on the embeddable registry to be
// populated correctly otherwise
jest.mock('@kbn/saved-search-component', () => ({
  LazySavedSearchComponent: jest.fn((props) => <div data-test-subj="embeddedSavedSearchMock" />),
}));

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

const mockMlApi: LogsOverviewDependencies['mlApi'] = {
  checkMlCapabilities: jest.fn(),
};

const mockDependencies: LogsOverviewDependencies = {
  ...commonDependencies,
  ...mockLogCategoriesDependencies,
  ...mockLogEventsDependencies,
  logsDataAccess: logsDataAccessPluginMock.createStartContract(),
  mlApi: mockMlApi,
};

describe('LogsOverview', () => {
  const defaultProps: LogsOverviewProps = {
    dependencies: mockDependencies,
    height: 400,
    timeRange: { start: '2023-01-01T00:00:00Z', end: '2023-01-02T00:00:00Z' },
  };
  const mockDataView = createStubDataView({
    spec: {
      title: 'logs-test-*',
    },
  });

  beforeAll(() => {
    jest
      .spyOn(mockDependencies.logsDataAccess.services.logSourcesService, 'getFlattenedLogSources')
      .mockResolvedValue('logs');
    jest.spyOn(mockDependencies.dataViews, 'create').mockResolvedValue(mockDataView);
    jest.spyOn(mockMlApi, 'checkMlCapabilities').mockResolvedValue({
      isPlatinumOrTrialLicense: true,
      mlFeatureEnabledInSpace: true,
      upgradeInProgress: false,
      capabilities: {} as any, // not used by the component
    });
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('displays the log events by default', async () => {
    const { findByTestId } = renderWithKibanaRenderContext(<LogsOverview {...defaultProps} />);

    expect(await findByTestId('embeddedSavedSearchMock')).toBeInTheDocument();
  });

  describe('with patterns feature flag enabled', () => {
    it('shows the grouping selector', async () => {
      const { findByTestId } = renderWithKibanaRenderContext(
        <LogsOverview {...defaultProps} featureFlags={{ isPatternsEnabled: true }} />
      );

      expect(await findByTestId('logsOverviewGroupingSelector')).toBeInTheDocument();
    });
  });

  describe('with patterns feature flag disabled', () => {
    it('does not show the grouping selector', async () => {
      const { findByTestId, queryByTestId } = renderWithKibanaRenderContext(
        <LogsOverview {...defaultProps} featureFlags={{ isPatternsEnabled: false }} />
      );

      expect(await findByTestId('logsExplorerDiscoverFallbackLink')).toBeInTheDocument();
      expect(queryByTestId('logsOverviewGroupingSelector')).not.toBeInTheDocument();
    });
  });

  describe('with ml features being disabled', () => {
    beforeAll(() => {
      jest.spyOn(mockMlApi, 'checkMlCapabilities').mockResolvedValue({
        isPlatinumOrTrialLicense: true,
        mlFeatureEnabledInSpace: false,
        upgradeInProgress: false,
        capabilities: {} as any,
      });
    });

    it('does not show the grouping selector', async () => {
      const { findByTestId, queryByTestId } = renderWithKibanaRenderContext(
        <LogsOverview {...defaultProps} featureFlags={{ isPatternsEnabled: true }} />
      );

      expect(await findByTestId('logsExplorerDiscoverFallbackLink')).toBeInTheDocument();
      expect(queryByTestId('logsOverviewGroupingSelector')).not.toBeInTheDocument();
    });
  });

  describe('with an insufficient license', () => {
    beforeAll(() => {
      jest.spyOn(mockMlApi, 'checkMlCapabilities').mockResolvedValue({
        isPlatinumOrTrialLicense: false,
        mlFeatureEnabledInSpace: true,
        upgradeInProgress: false,
        capabilities: {} as any,
      });
    });

    afterAll(() => {
      jest.resetAllMocks();
    });

    it('displays the insufficient license callout', async () => {
      const { findByTestId } = renderWithKibanaRenderContext(<LogsOverview {...defaultProps} />);

      expect(await findByTestId('logsOverviewGroupingLicenseCtaCallout')).toBeInTheDocument();
    });
  });
});

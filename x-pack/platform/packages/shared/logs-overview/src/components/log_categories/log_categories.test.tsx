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
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import '@testing-library/jest-dom';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Subject, throwError } from 'rxjs';
import type { LogCategoriesDependencies, LogCategoriesProps } from './log_categories';
import { LogCategories } from './log_categories';
import type { GroupingCapabilities } from '../shared/control_bar';

const mockDataView = createStubDataView({
  spec: { title: 'logs-test-*', timeFieldName: '@timestamp' },
});

const testLogsSource = {
  type: 'index_name' as const,
  indexName: 'logs-test-*',
  timestampField: '@timestamp',
  messageField: 'message',
  dataView: mockDataView,
};

const availableGroupingCapabilities: GroupingCapabilities = { status: 'available' };

const makeProps = (searchMock: jest.Mock): LogCategoriesProps => ({
  dependencies: {
    charts: chartPluginMock.createStartContract(),
    dataViews: dataViewPluginMocks.createStartContract(),
    embeddable: embeddablePluginMock.createStartContract(),
    search: searchMock,
    searchSource: dataPluginMock.createStartContract().search.searchSource,
    share: sharePluginMock.createStartContract(),
    theme: themeServiceMock.createStartContract(),
    uiSettings: settingsServiceMock.createStartContract(),
  } satisfies LogCategoriesDependencies,
  documentFilters: [],
  logsSource: testLogsSource,
  timeRange: { start: '2024-01-01T00:00:00Z', end: '2024-01-02T00:00:00Z' },
  grouping: 'categories',
  groupingCapabilities: availableGroupingCapabilities,
  onChangeGrouping: jest.fn(),
});

describe('LogCategories', () => {
  it('Cancel shows neutral cancelled prompt, NOT the error prompt', async () => {
    // Return a never-completing Subject so the machine stays in countingDocuments
    const subject = new Subject();
    const searchMock = jest.fn(() => subject.asObservable());

    renderWithKibanaRenderContext(<LogCategories {...makeProps(searchMock)} />);

    // Loading spinner must appear first
    const cancelButton = await screen.findByTestId('o11yLogCategoriesLoadingContentButton');
    expect(cancelButton).toBeInTheDocument();

    // Click Cancel
    await userEvent.click(cancelButton);

    // The cancelled prompt must appear…
    expect(
      await screen.findByTestId('logsOverviewLogCategoriesCancelledPrompt')
    ).toBeInTheDocument();

    // …and the error prompt must NOT appear
    expect(screen.queryByText('Failed to categorize logs')).not.toBeInTheDocument();

    subject.complete();
  });

  it('Load patterns button after cancel restarts loading', async () => {
    const subject = new Subject();
    const searchMock = jest.fn(() => subject.asObservable());

    renderWithKibanaRenderContext(<LogCategories {...makeProps(searchMock)} />);

    const cancelButton = await screen.findByTestId('o11yLogCategoriesLoadingContentButton');
    await userEvent.click(cancelButton);

    expect(
      await screen.findByTestId('logsOverviewLogCategoriesCancelledPrompt')
    ).toBeInTheDocument();

    const loadButton = screen.getByTestId('logsOverviewLogCategoriesLoadButton');
    await userEvent.click(loadButton);

    // Should be back to a loading state (cancel button visible)
    expect(await screen.findByTestId('o11yLogCategoriesLoadingContentButton')).toBeInTheDocument();
    expect(
      screen.queryByTestId('logsOverviewLogCategoriesCancelledPrompt')
    ).not.toBeInTheDocument();

    subject.complete();
  });

  it('genuine search failure shows error prompt with readable message, not raw stack', async () => {
    const distinctiveStack = 'DISTINCTIVE_STACK_TOKEN';
    const testError = new Error('Something went wrong fetching logs');
    testError.stack = `Error: Something went wrong\n    at ${distinctiveStack}`;

    const searchMock = jest.fn(() => throwError(() => testError));

    renderWithKibanaRenderContext(<LogCategories {...makeProps(searchMock)} />);

    // Human-readable message must be visible
    expect(await screen.findByText('Something went wrong fetching logs')).toBeInTheDocument();

    const stackElement = await screen.findByText(new RegExp(distinctiveStack));
    expect(stackElement).not.toBeVisible();
  });
});

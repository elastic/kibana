/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { Router } from '@kbn/shared-ux-router';
import { render } from '@testing-library/react';
import { createBrowserHistory } from 'history';

import { I18nProvider } from '@kbn/i18n-react';

import { AnomalyResultsViewSelector } from '.';

vi.mock('../../contexts/kibana', () => {
  return {
    useMlLocator: async () =>
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      (await import('@kbn/share-plugin/public/mocks')).sharePluginMock.createLocator(),
    useNavigateToPath: () => vi.fn(),
  };
});

describe('AnomalyResultsViewSelector', () => {
  test('should create selector with correctly selected value', () => {
    const history = createBrowserHistory();

    const { getByTestId } = render(
      <I18nProvider>
        <Router history={history}>
          <AnomalyResultsViewSelector viewId="timeseriesexplorer" />
        </Router>
      </I18nProvider>
    );

    // Check the Single Metric Viewer element exists in the selector, and that it is checked.
    expect(getByTestId('mlAnomalyResultsViewSelectorSingleMetricViewer')).toBeInTheDocument();
    expect(getByTestId('mlAnomalyResultsViewSelectorSingleMetricViewer')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });
});

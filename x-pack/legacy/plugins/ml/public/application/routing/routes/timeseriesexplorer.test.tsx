/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';

import { I18nProvider } from '@kbn/i18n/react';

import { TimeSeriesExplorerUrlStateManager } from './timeseriesexplorer';

jest.mock('../../contexts/kibana', () => ({
  useMlKibana: () => {
    return {
      services: {
        data: {
          query: {
            timefilter: {
              timefilter: {
                enableTimeRangeSelector: jest.fn(),
                enableAutoRefreshSelector: jest.fn(),
              },
            },
          },
        },
      },
    };
  },
}));

jest.mock('../../util/dependency_cache', () => ({
  getTimefilter: () => ({
    enableTimeRangeSelector: jest.fn(),
    enableAutoRefreshSelector: jest.fn(),
    setTime: () => jest.fn(),
    getBounds: () => jest.fn(),
    isTimeRangeSelectorEnabled: () => true,
    isAutoRefreshSelectorEnabled: () => true,
    getTime: () => ({ from: '', to: '' }),
    getRefreshInterval: () => ({ pause: false }),
    setRefreshInterval: jest.fn(),
    getRefreshIntervalUpdate$: jest.fn(),
    getTimeUpdate$: jest.fn(),
    getEnabledUpdated$: jest.fn(),
  }),
  getTimeHistory: () => ({ get: jest.fn() }),
  getUiSettings: () => ({ get: jest.fn() }),
  getToastNotifications: () => ({ addSuccess: jest.fn(), addDanger: jest.fn() }),
}));

describe('TimeSeriesExplorerUrlStateManager', () => {
  test('Initial render shows "No single metric jobs found"', () => {
    const props = {
      config: { get: () => 'Browser' },
      jobsWithTimeRange: [],
    };

    const { container } = render(
      <I18nProvider>
        <MemoryRouter>
          <TimeSeriesExplorerUrlStateManager {...props} />
        </MemoryRouter>
      </I18nProvider>
    );

    expect(container.textContent).toContain('No single metric jobs found');
  });
});

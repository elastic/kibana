/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedClass, MockedFunction } from 'vitest';

import type { PropsWithChildren } from 'react';
import React from 'react';
import { render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { TimeSeriesExplorerUrlStateManager } from './state_manager';
import { TimeSeriesExplorer } from '../../../timeseriesexplorer';
import { TimeSeriesExplorerPage } from '../../../timeseriesexplorer/timeseriesexplorer_page';
import { TimeseriesexplorerNoJobsFound } from '../../../timeseriesexplorer/components/timeseriesexplorer_no_jobs_found';
import { DatePickerContextProvider, type DatePickerDependencies } from '@kbn/ml-date-picker';
import type { IUiSettingsClient } from '@kbn/core/public';

vi.mock('../../../services/toast_notification_service');

vi.mock('../../../timeseriesexplorer', () => {
  const mocked = {
    TimeSeriesExplorer: vi.fn(() => {
      return null;
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../timeseriesexplorer/timeseriesexplorer_page', () => {
  const mocked = {
    TimeSeriesExplorerPage: vi.fn(({ children }: PropsWithChildren<unknown>) => {
      return <>{children}</>;
    }),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../timeseriesexplorer/components/timeseriesexplorer_no_jobs_found', () => {
  const mocked = {
    TimeseriesexplorerNoJobsFound: vi.fn(() => {
      return null;
    }),
  };
  return { ...mocked, default: mocked };
});

const MockedTimeSeriesExplorer = TimeSeriesExplorer as MockedClass<typeof TimeSeriesExplorer>;
const MockedTimeSeriesExplorerPage = TimeSeriesExplorerPage as MockedFunction<
  typeof TimeSeriesExplorerPage
>;
const MockedTimeseriesexplorerNoJobsFound = TimeseriesexplorerNoJobsFound as MockedFunction<
  typeof TimeseriesexplorerNoJobsFound
>;

const getMockedTimefilter = () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { of } = require('rxjs');
  return {
    timefilter: {
      disableTimeRangeSelector: vi.fn(),
      disableAutoRefreshSelector: vi.fn(),
      enableTimeRangeSelector: vi.fn(),
      enableAutoRefreshSelector: vi.fn(),
      getRefreshInterval: vi.fn(),
      setRefreshInterval: vi.fn(),
      getActiveBounds: vi.fn(),
      getTime: vi.fn(),
      isAutoRefreshSelectorEnabled: vi.fn(),
      isTimeRangeSelectorEnabled: vi.fn(),
      getRefreshIntervalUpdate$: vi.fn(),
      getTimeUpdate$: vi.fn(() => {
        return of();
      }),
      getEnabledUpdated$: vi.fn(),
    },
    history: { get: vi.fn() },
  };
};

const getMockedDatePickerDependencies = () => {
  return {
    data: {
      query: {
        timefilter: getMockedTimefilter(),
      },
    },
    notifications: {},
  } as unknown as DatePickerDependencies;
};

vi.mock('@kbn/ml-url-state', () => {
  return {
    usePageUrlState: vi.fn(() => {
      return [{}, vi.fn(), {}];
    }),
    useUrlState: vi.fn(() => {
      return [{ refreshInterval: { value: 0, pause: true } }, vi.fn()];
    }),
  };
});

vi.mock('../../../timeseriesexplorer/hooks/use_timeseriesexplorer_url_state');

vi.mock('../../../components/help_menu', () => {
  const mocked = {
    HelpMenu: () => <div id="mockHelpMenu" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../contexts/kibana/kibana_context', () => {
  return {
    useMlKibana: () => {
      return {
        services: {
          chrome: { docTitle: { change: vi.fn() } },
          application: { getUrlForApp: vi.fn(), navigateToUrl: vi.fn() },
          share: {
            urlGenerators: { getUrlGenerator: vi.fn() },
          },
          uiSettings: { get: vi.fn() },
          data: {
            query: {
              timefilter: getMockedTimefilter(),
            },
          },
          mlServices: { mlApi: {} },
          notifications: {
            toasts: {
              addDanger: () => {},
            },
          },
          docLinks: {
            links: {
              ml: { anomalyDetection: vi.fn() },
            },
          },
        },
      };
    },
  };
});

describe('TimeSeriesExplorerUrlStateManager', () => {
  test('should render TimeseriesexplorerNoJobsFound when no jobs provided', () => {
    const props = {
      config: { get: () => 'Browser' } as unknown as IUiSettingsClient,
      jobsWithTimeRange: [],
    };

    render(
      <I18nProvider>
        <DatePickerContextProvider {...getMockedDatePickerDependencies()}>
          <TimeSeriesExplorerUrlStateManager {...props} />
        </DatePickerContextProvider>
      </I18nProvider>
    );

    // assert
    expect(MockedTimeSeriesExplorer).not.toHaveBeenCalled();
    expect(MockedTimeSeriesExplorerPage).toHaveBeenCalled();
    expect(MockedTimeseriesexplorerNoJobsFound).toHaveBeenCalled();
  });
});

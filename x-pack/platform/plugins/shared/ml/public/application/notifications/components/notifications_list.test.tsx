/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React, { type FC, type PropsWithChildren } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { render, waitFor } from '@testing-library/react';
import { DatePickerContextProvider, type DatePickerDependencies } from '@kbn/ml-date-picker';
import { NotificationsList } from './notifications_list';
import { useMlKibana } from '../../contexts/kibana';

vi.mock('../../contexts/kibana');
vi.mock('../../services/toast_notification_service');
vi.mock('../../contexts/ml/ml_notifications_context');
vi.mock('../../contexts/kibana/use_field_formatter');
vi.mock('../../components/saved_objects_warning');
vi.mock('../../capabilities/check_capabilities');

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
      getTime: vi.fn(() => {
        return { from: '', to: '' };
      }),
      setTime: vi.fn(),
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

const getMockedDatePickeDependencies = () => {
  return {
    data: {
      query: {
        timefilter: getMockedTimefilter(),
      },
    },
    notifications: {},
  } as unknown as DatePickerDependencies;
};

const Wrapper: FC<PropsWithChildren<unknown>> = ({ children }) => (
  <I18nProvider>
    <DatePickerContextProvider {...getMockedDatePickeDependencies()}>
      {children}
    </DatePickerContextProvider>
  </I18nProvider>
);

describe('NotificationsList', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  test('starts fetching notification on mount with default params', async () => {
    const {} = render(<NotificationsList />, { wrapper: Wrapper });

    vi.advanceTimersByTime(500);

    await waitFor(() => {
      expect(
        useMlKibana().services.mlServices.mlApi.notifications.findMessages
      ).toHaveBeenCalledTimes(1);
      expect(
        useMlKibana().services.mlServices.mlApi.notifications.findMessages
      ).toHaveBeenCalledWith({
        earliest: '',
        latest: '',
        queryString: '*',
        sortDirection: 'desc',
        sortField: 'timestamp',
      });
    });
  });
});

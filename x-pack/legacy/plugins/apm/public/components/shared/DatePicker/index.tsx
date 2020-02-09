/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSuperDatePicker } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { fromQuery, toQuery } from '../Links/url_helpers';
import { history } from '../../../utils/history';
import { useLocation } from '../../../hooks/useLocation';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { clearCache } from '../../../services/rest/callApi';

export function DatePicker() {
  const location = useLocation();
  const { urlParams, refreshTimeRange } = useUrlParams();
  const commonlyUsedRanges = [
    {
      start: 'now-15m',
      end: 'now',
      label: i18n.translate('xpack.apm.datePicker.last15MinutesLabel', {
        defaultMessage: 'Last 15 minutes'
      })
    },
    {
      start: 'now-30m',
      end: 'now',
      label: i18n.translate('xpack.apm.datePicker.last30MinutesLabel', {
        defaultMessage: 'Last 30 minutes'
      })
    },
    {
      start: 'now-1h',
      end: 'now',
      label: i18n.translate('xpack.apm.datePicker.last1HourLabel', {
        defaultMessage: 'Last 1 hour'
      })
    },
    {
      start: 'now-24h',
      end: 'now',
      label: i18n.translate('xpack.apm.datePicker.last24HoursLabel', {
        defaultMessage: 'Last 24 hours'
      })
    },
    {
      start: 'now-7d',
      end: 'now',
      label: i18n.translate('xpack.apm.datePicker.last7DaysLabel', {
        defaultMessage: 'Last 7 days'
      })
    },
    {
      start: 'now-30d',
      end: 'now',
      label: i18n.translate('xpack.apm.datePicker.last30DaysLabel', {
        defaultMessage: 'Last 30 days'
      })
    },
    {
      start: 'now-90d',
      end: 'now',
      label: i18n.translate('xpack.apm.datePicker.last90DaysLabel', {
        defaultMessage: 'Last 90 days'
      })
    },
    {
      start: 'now-1y',
      end: 'now',
      label: i18n.translate('xpack.apm.datePicker.last1YearLabel', {
        defaultMessage: 'Last 1 year'
      })
    }
  ];

  function updateUrl(nextQuery: {
    rangeFrom?: string;
    rangeTo?: string;
    refreshPaused?: boolean;
    refreshInterval?: number;
  }) {
    history.push({
      ...location,
      search: fromQuery({
        ...toQuery(location.search),
        ...nextQuery
      })
    });
  }

  function onRefreshChange({
    isPaused,
    refreshInterval
  }: {
    isPaused: boolean;
    refreshInterval: number;
  }) {
    updateUrl({ refreshPaused: isPaused, refreshInterval });
  }

  function onTimeChange({ start, end }: { start: string; end: string }) {
    updateUrl({ rangeFrom: start, rangeTo: end });
  }

  const { rangeFrom, rangeTo, refreshPaused, refreshInterval } = urlParams;

  return (
    <EuiSuperDatePicker
      start={rangeFrom}
      end={rangeTo}
      isPaused={refreshPaused}
      refreshInterval={refreshInterval}
      onTimeChange={onTimeChange}
      onRefresh={({ start, end }) => {
        clearCache();
        refreshTimeRange({ rangeFrom: start, rangeTo: end });
      }}
      onRefreshChange={onRefreshChange}
      showUpdateButton={true}
      commonlyUsedRanges={commonlyUsedRanges}
    />
  );
}

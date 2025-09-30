/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback } from 'react';
import type { TimeRange } from '@kbn/es-query';
import { useDatasetQualityDetailsState } from '../../../hooks';
import { useKibanaContextForPlugin } from '../../../utils/use_kibana';
import { overviewHeaderTitle } from '../../../../common/translations';

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default function OverviewHeader({
  handleRefresh,
}: {
  handleRefresh: (dateRange: TimeRange) => void;
}) {
  const { timeRange, updateTimeRange, onRefreshChange } = useDatasetQualityDetailsState();
  const { unifiedSearch } = useKibanaContextForPlugin().services;

  const onTimeChange = useCallback(
    ({ ...timeRangeProps }: { start: string; end: string }) => {
      updateTimeRange({ ...timeRangeProps });
    },
    [updateTimeRange]
  );

  return (
    <EuiFlexGroup alignItems="center" wrap={true}>
      <EuiFlexGroup
        css={css`
          flex-grow: 1;
        `}
        justifyContent="flexStart"
        alignItems="center"
        gutterSize="xs"
      >
        <EuiTitle size="s">
          <span>{overviewHeaderTitle}</span>
        </EuiTitle>
      </EuiFlexGroup>

      <EuiFlexGroup
        css={css`
          flex-grow: 0;
        `}
      >
        <unifiedSearch.ui.SearchBar
          appName="datasetQualityDetails"
          showDatePicker={true}
          showFilterBar={false}
          showQueryMenu={false}
          showQueryInput={false}
          submitButtonStyle="iconOnly"
          displayStyle="inPage"
          disableQueryLanguageSwitcher
          query={undefined}
          dateRangeFrom={timeRange.from}
          dateRangeTo={timeRange.to}
          onQuerySubmit={(payload) =>
            onTimeChange({ start: payload.dateRange.from, end: payload.dateRange.to })
          }
          onRefresh={(payload) => handleRefresh(payload.dateRange)}
          onRefreshChange={({ refreshInterval, isPaused }) =>
            onRefreshChange({ refreshInterval, isPaused })
          }
          refreshInterval={timeRange.refresh.value}
          isRefreshPaused={timeRange.refresh.pause}
        />
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}

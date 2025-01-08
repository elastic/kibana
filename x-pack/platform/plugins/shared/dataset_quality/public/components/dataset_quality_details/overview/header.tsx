/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiIcon,
  EuiSuperDatePicker,
  EuiTitle,
  EuiToolTip,
  OnRefreshProps,
  OnTimeChangeProps,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback } from 'react';
import { useDatasetQualityDetailsState } from '../../../hooks';
import { overviewHeaderTitle, overviewTitleTooltip } from '../../../../common/translations';

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default function OverviewHeader({
  handleRefresh,
}: {
  handleRefresh: (refreshProps: OnRefreshProps) => void;
}) {
  const { timeRange, updateTimeRange } = useDatasetQualityDetailsState();

  const onTimeChange = useCallback(
    ({ isInvalid, ...timeRangeProps }: OnTimeChangeProps) => {
      if (!isInvalid) {
        updateTimeRange({ refreshInterval: timeRange.refresh.value, ...timeRangeProps });
      }
    },
    [updateTimeRange, timeRange.refresh]
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
        <EuiToolTip content={overviewTitleTooltip}>
          <EuiIcon size="m" color="subdued" type="questionInCircle" className="eui-alignTop" />
        </EuiToolTip>
      </EuiFlexGroup>

      <EuiFlexGroup
        css={css`
          flex-grow: 0;
        `}
      >
        <EuiSuperDatePicker
          width="auto"
          compressed={true}
          isLoading={false}
          start={timeRange.from}
          end={timeRange.to}
          onTimeChange={onTimeChange}
          onRefresh={handleRefresh}
          isQuickSelectOnly={false}
          showUpdateButton="iconOnly"
          updateButtonProps={{ fill: false }}
        />
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
}

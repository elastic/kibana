/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSuperDatePicker } from '@elastic/eui';
import React from 'react';
import { useTimeRange } from '../../hooks/use_time_range';
import { useTimeRangeUpdate } from '../../hooks/use_time_range_update';
import { useTimefilter } from '../../hooks/use_timefilter';

export function OverviewTimeFilter() {
  const { rangeFrom, rangeTo } = useTimeRange();
  const { updateTimeRange } = useTimeRangeUpdate();
  const { refresh } = useTimefilter();

  return (
    <EuiFlexGroup gutterSize="xs">
      <EuiFlexItem>
        <EuiSuperDatePicker
          start={rangeFrom}
          end={rangeTo}
          compressed
          onRefresh={() => refresh()}
          width="full"
          showUpdateButton="iconOnly"
          updateButtonProps={{
            size: 's',
            fill: false,
          }}
          onTimeChange={({ start, end }) => updateTimeRange({ from: start, to: end })}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

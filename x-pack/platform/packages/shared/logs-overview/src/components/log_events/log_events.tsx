/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { CSSProperties } from 'react';
import {
  LogEventsControlBar,
  LogEventsControlBarDependencies,
  LogEventsControlBarProps,
} from './log_events_control_bar';
import {
  LogEventsResultContent,
  LogEventsResultContentDependencies,
  LogEventsResultContentProps,
} from './log_events_result_content';

export type LogEventsProps = LogEventsControlBarProps &
  LogEventsResultContentProps & {
    dependencies: LogEventsDependencies;
    height?: CSSProperties['height'];
  };

export type LogEventsDependencies = LogEventsControlBarDependencies &
  LogEventsResultContentDependencies;

export const LogEvents = React.memo<LogEventsProps>(
  ({
    dependencies,
    documentFilters,
    logsSource,
    timeRange,
    grouping,
    groupingCapabilities,
    height,
    onChangeGrouping,
  }) => {
    return (
      <EuiFlexGroup
        direction="column"
        gutterSize="m"
        style={{ height }}
        data-test-subj="logsOverviewLogEvents"
      >
        <EuiFlexItem grow={false}>
          <LogEventsControlBar
            dependencies={dependencies}
            documentFilters={documentFilters}
            logsSource={logsSource}
            timeRange={timeRange}
            grouping={grouping}
            groupingCapabilities={groupingCapabilities}
            onChangeGrouping={onChangeGrouping}
          />
        </EuiFlexItem>
        <EuiFlexItem grow>
          <LogEventsResultContent
            dependencies={dependencies}
            documentFilters={documentFilters}
            logsSource={logsSource}
            timeRange={timeRange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

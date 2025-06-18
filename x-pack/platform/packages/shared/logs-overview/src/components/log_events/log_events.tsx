/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ISearchGeneric } from '@kbn/search-types';
import React from 'react';
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
  LogEventsContentProps & {
    dependencies: LogEventsDependencies;
  };

export type LogEventsDependencies = LogEventsControlBarDependencies & LogEventsContentDependencies;

export const LogEvents = React.memo<LogEventsProps>(
  ({ dependencies, documentFilters, logsSource, timeRange, grouping, onChangeGrouping }) => {
    return (
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem grow={false}>
          <LogEventsControlBar
            dependencies={dependencies}
            documentFilters={documentFilters}
            logsSource={logsSource}
            timeRange={timeRange}
            grouping={grouping}
            onChangeGrouping={onChangeGrouping}
          />
        </EuiFlexItem>
        <EuiFlexItem grow>
          <LogEventsResultContent />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

export type LogEventsContentProps = LogEventsResultContentProps & {
  dependencies: LogEventsContentDependencies;
};

export type LogEventsContentDependencies = LogEventsResultContentDependencies & {
  search: ISearchGeneric;
};

export const LogEventsContent = React.memo<LogEventsContentProps>(({ dependencies }) => {
  return <LogEventsResultContent />;
});

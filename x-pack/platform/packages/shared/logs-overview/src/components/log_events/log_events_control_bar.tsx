/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ControlBarDependencies, ControlBarProps } from '../shared/control_bar';
import { ControlBar } from '../shared/control_bar';

export type LogEventsControlBarProps = ControlBarProps;

export type LogEventsControlBarDependencies = ControlBarDependencies;

export const LogEventsControlBar: React.FC<LogEventsControlBarProps> = React.memo(
  ({
    dependencies,
    documentFilters,
    logsSource,
    timeRange,
    grouping,
    groupingCapabilities,
    onChangeGrouping,
  }) => {
    return (
      <ControlBar
        dependencies={dependencies}
        documentFilters={documentFilters}
        logsSource={logsSource}
        timeRange={timeRange}
        grouping={grouping}
        groupingCapabilities={groupingCapabilities}
        onChangeGrouping={onChangeGrouping}
      />
    );
  }
);

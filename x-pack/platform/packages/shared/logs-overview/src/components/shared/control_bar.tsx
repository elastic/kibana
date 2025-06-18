/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useMemo } from 'react';
import { DiscoverLink, DiscoverLinkDependencies, DiscoverLinkProps } from '../discover_link';
import { GroupingSelector, GroupingSelectorProps } from './grouping_selector';

export type ControlBarProps = Pick<DiscoverLinkProps, 'logsSource' | 'timeRange'> &
  Pick<GroupingSelectorProps, 'grouping' | 'onChangeGrouping'> & {
    documentFilters?: QueryDslQueryContainer[];
    dependencies: ControlBarDependencies;
  };

export type ControlBarDependencies = DiscoverLinkDependencies;

export const ControlBar: React.FC<ControlBarProps> = React.memo(
  ({ dependencies, documentFilters, logsSource, timeRange, grouping, onChangeGrouping }) => {
    const linkFilters = useMemo(
      () => documentFilters?.map((filter) => ({ filter })),
      [documentFilters]
    );

    return (
      <EuiFlexGroup direction="row" justifyContent="flexEnd" alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <DiscoverLink
            dependencies={dependencies}
            documentFilters={linkFilters}
            logsSource={logsSource}
            timeRange={timeRange}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <GroupingSelector grouping={grouping} onChangeGrouping={onChangeGrouping} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

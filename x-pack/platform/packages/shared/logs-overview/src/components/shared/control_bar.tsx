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
import {
  GroupingLicenseCtaPopover,
  GroupingLicenseCtaPopoverDependencies,
} from './grouping_license_cta_popover';

export type ControlBarProps = Pick<DiscoverLinkProps, 'logsSource' | 'timeRange'> &
  Pick<GroupingSelectorProps, 'grouping' | 'onChangeGrouping'> & {
    dependencies: ControlBarDependencies;
    documentFilters?: QueryDslQueryContainer[];
    groupingCapabilities: GroupingCapabilities;
  };

export type ControlBarDependencies = DiscoverLinkDependencies &
  GroupingLicenseCtaPopoverDependencies;

export type GroupingCapabilities =
  | {
      status: 'available';
    }
  | {
      status: 'unavailable';
      reason: 'disabled' | 'insufficientLicense' | 'unknown';
    };

export const ControlBar: React.FC<ControlBarProps> = React.memo(
  ({
    dependencies,
    documentFilters,
    logsSource,
    timeRange,
    grouping,
    groupingCapabilities,
    onChangeGrouping,
  }) => {
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
          {groupingCapabilities.status === 'unavailable' ? (
            groupingCapabilities.reason === 'insufficientLicense' ? (
              <GroupingLicenseCtaPopover dependencies={dependencies} />
            ) : null
          ) : (
            <GroupingSelector grouping={grouping} onChangeGrouping={onChangeGrouping} />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useBoolean } from '@kbn/react-hooks';
import React, { useMemo } from 'react';
import type { DiscoverLinkDependencies, DiscoverLinkProps } from '../discover_link';
import { DiscoverLink } from '../discover_link';
import type { GroupingLicenseCtaCalloutDependencies } from './grouping_license_cta_callout';
import { GroupingLicenseCtaCallout } from './grouping_license_cta_callout';
import type { GroupingLicenseCtaPopoverDependencies } from './grouping_license_cta_popover';
import { GroupingLicenseCtaPopover } from './grouping_license_cta_popover';
import type { GroupingLicenseDetailsModalDependencies } from './grouping_license_details_modal';
import { GroupingLicenseDetailsModal } from './grouping_license_details_modal';
import type { GroupingSelectorProps } from './grouping_selector';
import { GroupingSelector } from './grouping_selector';

export type ControlBarProps = Pick<DiscoverLinkProps, 'logsSource' | 'timeRange'> &
  Pick<GroupingSelectorProps, 'grouping' | 'onChangeGrouping'> & {
    dependencies: ControlBarDependencies;
    documentFilters?: QueryDslQueryContainer[];
    groupingCapabilities: GroupingCapabilities;
  };

export type ControlBarDependencies = DiscoverLinkDependencies &
  GroupingLicenseCtaPopoverDependencies &
  GroupingLicenseCtaCalloutDependencies &
  GroupingLicenseDetailsModalDependencies;

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
    const [
      areGroupingLicenseDetailsShown,
      { on: showGroupingLicenseDetails, off: hideGroupingLicenseDetails },
    ] = useBoolean(false);

    const linkFilters = useMemo(
      () => documentFilters?.map((filter) => ({ filter })),
      [documentFilters]
    );

    const groupingControl =
      groupingCapabilities.status === 'unavailable' ? (
        groupingCapabilities.reason === 'insufficientLicense' ? (
          <GroupingLicenseCtaPopover
            dependencies={dependencies}
            showDetails={showGroupingLicenseDetails}
          />
        ) : null
      ) : (
        <GroupingSelector grouping={grouping} onChangeGrouping={onChangeGrouping} />
      );

    return (
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="row" justifyContent="flexEnd" alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <DiscoverLink
                dependencies={dependencies}
                documentFilters={linkFilters}
                logsSource={logsSource}
                timeRange={timeRange}
              />
            </EuiFlexItem>
            {groupingControl != null ? (
              <EuiFlexItem grow={false}>{groupingControl}</EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
        {groupingCapabilities.status === 'unavailable' &&
        groupingCapabilities.reason === 'insufficientLicense' ? (
          <EuiFlexItem grow={false}>
            <GroupingLicenseCtaCallout
              dependencies={dependencies}
              showDetails={showGroupingLicenseDetails}
            />
            <GroupingLicenseDetailsModal
              dependencies={dependencies}
              isOpen={areGroupingLicenseDetailsShown}
              onClose={hideGroupingLicenseDetails}
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    );
  }
);

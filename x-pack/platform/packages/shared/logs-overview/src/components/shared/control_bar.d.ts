import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import React from 'react';
import type { DiscoverLinkDependencies, DiscoverLinkProps } from '../discover_link';
import type { GroupingLicenseCtaCalloutDependencies } from './grouping_license_cta_callout';
import type { GroupingLicenseCtaPopoverDependencies } from './grouping_license_cta_popover';
import type { GroupingLicenseDetailsModalDependencies } from './grouping_license_details_modal';
import type { GroupingSelectorProps } from './grouping_selector';
export type ControlBarProps = Pick<DiscoverLinkProps, 'logsSource' | 'timeRange'> & Pick<GroupingSelectorProps, 'grouping' | 'onChangeGrouping'> & {
    dependencies: ControlBarDependencies;
    documentFilters?: QueryDslQueryContainer[];
    groupingCapabilities: GroupingCapabilities;
};
export type ControlBarDependencies = DiscoverLinkDependencies & GroupingLicenseCtaPopoverDependencies & GroupingLicenseCtaCalloutDependencies & GroupingLicenseDetailsModalDependencies;
export type GroupingCapabilities = {
    status: 'available';
} | {
    status: 'unavailable';
    reason: 'disabled' | 'insufficientLicense' | 'unknown';
};
export declare const ControlBar: React.FC<ControlBarProps>;

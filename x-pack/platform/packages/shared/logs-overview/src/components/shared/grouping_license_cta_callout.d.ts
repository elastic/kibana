import React from 'react';
import type { GroupingLicenseCtaMessageDetailsButtonProps, GroupingLicenseCtaMessageTrialButtonDependencies } from './grouping_license_cta_shared';
export type GroupingLicenseCtaCalloutProps = GroupingLicenseCtaMessageDetailsButtonProps & {
    dependencies: GroupingLicenseCtaCalloutDependencies;
};
export type GroupingLicenseCtaCalloutDependencies = GroupingLicenseCtaMessageTrialButtonDependencies;
export declare const GroupingLicenseCtaCallout: React.NamedExoticComponent<GroupingLicenseCtaCalloutProps>;
export declare const CALLOUT_DISMISSED_AT_LOCAL_STORAGE_KEY = "logsOverview:groupingLicenseCtaCalloutDismissedAt";

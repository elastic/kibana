import React from 'react';
import type { GroupingLicenseCtaMessageDetailsButtonProps, GroupingLicenseCtaMessageTrialButtonDependencies } from './grouping_license_cta_shared';
export type GroupingLicenseCtaPopoverProps = GroupingLicenseCtaMessageDetailsButtonProps & {
    dependencies: GroupingLicenseCtaPopoverDependencies;
};
export type GroupingLicenseCtaPopoverDependencies = GroupingLicenseCtaMessageTrialButtonDependencies;
export declare const GroupingLicenseCtaPopover: React.NamedExoticComponent<GroupingLicenseCtaPopoverProps>;

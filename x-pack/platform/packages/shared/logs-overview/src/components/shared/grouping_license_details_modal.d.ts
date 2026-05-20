import React from 'react';
import type { GroupingLicenseCtaMessageTrialButtonDependencies } from './grouping_license_cta_shared';
import type { GroupingPreviewDependencies } from './grouping_preview';
export interface GroupingLicenseDetailsModalProps {
    dependencies: GroupingLicenseDetailsModalDependencies;
    isOpen: boolean;
    onClose: () => void;
}
export type GroupingLicenseDetailsModalDependencies = GroupingLicenseCtaMessageTrialButtonDependencies & GroupingPreviewDependencies;
export declare const GroupingLicenseDetailsModal: React.NamedExoticComponent<GroupingLicenseDetailsModalProps>;

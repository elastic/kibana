import type { EuiButtonEmptyProps, EuiButtonProps } from '@elastic/eui';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import React from 'react';
export type GroupingLicenseCtaMessageDetailsButtonProps = Pick<EuiButtonEmptyProps, 'size'> & {
    showDetails: () => void;
};
export declare const GroupingLicenseCtaMessageDetailsButton: React.FC<GroupingLicenseCtaMessageDetailsButtonProps>;
export type GroupingLicenseCtaMessageTrialButtonProps = Pick<EuiButtonProps, 'size'> & {
    dependencies: GroupingLicenseCtaMessageTrialButtonDependencies;
};
export interface GroupingLicenseCtaMessageTrialButtonDependencies {
    share: SharePluginStart;
}
export declare const GroupingLicenseCtaMessageTrialButton: React.FC<GroupingLicenseCtaMessageTrialButtonProps> & {
    canRender: (dependencies: GroupingLicenseCtaMessageTrialButtonDependencies) => boolean;
};
export declare const groupingLicenseCtaMessageTitle: string;
export declare const groupingLicenseCtaMessageDescription: string;
export declare const groupingLicenseCtaMessageDetailsButtonTitle: string;
export declare const groupingLicenseCtaMessageTrialButtonTitle: string;

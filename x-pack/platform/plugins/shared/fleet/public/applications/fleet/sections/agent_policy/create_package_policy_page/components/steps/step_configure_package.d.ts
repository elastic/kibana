import React from 'react';
import type { PackageInfo, NewPackagePolicy } from '../../../../../types';
import type { PackagePolicyValidationResults, VarGroupSelection } from '../../services';
export declare const StepConfigurePackagePolicy: React.FunctionComponent<{
    packageInfo: PackageInfo;
    showOnlyIntegration?: string;
    packagePolicy: NewPackagePolicy;
    updatePackagePolicy: (fields: Partial<NewPackagePolicy>) => void;
    validationResults: PackagePolicyValidationResults | undefined;
    submitAttempted: boolean;
    noTopRule?: boolean;
    isEditPage?: boolean;
    isUpgrade?: boolean;
    isAgentlessSelected?: boolean;
    varGroupSelections?: VarGroupSelection;
}>;

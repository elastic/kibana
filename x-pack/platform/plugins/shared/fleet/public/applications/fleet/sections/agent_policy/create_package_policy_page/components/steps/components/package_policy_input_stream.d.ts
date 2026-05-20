import React from 'react';
import type { NewPackagePolicyInputStream, PackageInfo, RegistryStreamWithDataStream } from '../../../../../../types';
import type { PackagePolicyConfigValidationResults } from '../../../services';
interface Props {
    packageInputStream: RegistryStreamWithDataStream;
    packageInfo: PackageInfo;
    packagePolicyInputStream: NewPackagePolicyInputStream;
    updatePackagePolicyInputStream: (updatedStream: Partial<NewPackagePolicyInputStream>) => void;
    inputStreamValidationResults: PackagePolicyConfigValidationResults;
    forceShowErrors?: boolean;
    isEditPage?: boolean;
    isUpgrade?: boolean;
    hasStreamToggle?: boolean;
    showDescriptionColumn?: boolean;
    varGroupSelections?: Record<string, string>;
    /** Parent input's `policy_template`; required for correct composable multi-template matching. */
    inputPolicyTemplate?: string;
}
export declare const PackagePolicyInputStreamConfig: React.NamedExoticComponent<Props>;
export {};

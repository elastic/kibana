import React from 'react';
import type { NewPackagePolicyInput, NewPackagePolicyInputStream, RegistrySection, RegistryVarGroup, RegistryVarsEntry } from '../../../../../../types';
import type { PackagePolicyConfigValidationResults } from '../../../services';
import type { VarGroupSelection } from '../../../services/var_group_helpers';
export interface StreamAdvancedVarsConfig {
    vars: RegistryVarsEntry[];
    packagePolicyInputStream: NewPackagePolicyInputStream;
    updatePackagePolicyInputStream: (updatedStream: Partial<NewPackagePolicyInputStream>) => void;
    validationResults: PackagePolicyConfigValidationResults;
}
export declare const PackagePolicyInputConfig: React.FunctionComponent<{
    hasInputStreams: boolean;
    packageInputVars?: RegistryVarsEntry[];
    packagePolicyInput: NewPackagePolicyInput;
    updatePackagePolicyInput: (updatedInput: Partial<NewPackagePolicyInput>) => void;
    inputValidationResults: PackagePolicyConfigValidationResults;
    forceShowErrors?: boolean;
    isEditPage?: boolean;
    varGroups?: RegistryVarGroup[];
    varGroupSelections?: VarGroupSelection;
    onVarGroupSelectionChange?: (groupName: string, optionName: string) => void;
    showDescriptionColumn?: boolean;
    streamAdvancedVars?: StreamAdvancedVarsConfig;
    sections?: RegistrySection[];
    isUpgrade?: boolean;
}>;

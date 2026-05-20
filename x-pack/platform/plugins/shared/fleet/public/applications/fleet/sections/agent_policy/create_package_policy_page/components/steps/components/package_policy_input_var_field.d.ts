import React from 'react';
import type { DataStream, RegistryVarsEntry } from '../../../../../../types';
export interface InputFieldProps {
    varDef: RegistryVarsEntry;
    value: any;
    onChange: (newValue: any) => void;
    errors?: string[] | null;
    forceShowErrors?: boolean;
    frozen?: boolean;
    packageType?: string;
    packageName?: string;
    datastreams?: DataStream[];
    isEditPage?: boolean;
    isRequiredByVarGroup?: boolean;
    isUpgrade?: boolean;
}
export declare const PackagePolicyInputVarField: React.FunctionComponent<InputFieldProps>;

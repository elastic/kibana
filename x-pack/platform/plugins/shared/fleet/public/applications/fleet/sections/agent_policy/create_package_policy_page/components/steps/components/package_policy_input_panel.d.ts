import React from 'react';
import type { NewPackagePolicyInput, PackageInfo, RegistryInput, RegistryStream, RegistryStreamWithDataStream } from '../../../../../../types';
import type { PackagePolicyInputValidationResults } from '../../../services';
import type { YamlParseFn } from '../../../services';
export declare const shouldShowStreamsByDefault: (parse: YamlParseFn, packageInput: RegistryInput, packageInputStreams: Array<RegistryStream & {
    data_stream: {
        dataset: string;
        type: string;
    };
}>, packagePolicyInput: NewPackagePolicyInput, defaultDataStreamId?: string) => boolean;
export declare const MigrationTooltip: ({ migrateFrom, isStream, }: {
    migrateFrom: string;
    isStream?: boolean;
}) => React.JSX.Element;
export declare const PackagePolicyInputPanel: React.FunctionComponent<{
    packageInput: RegistryInput;
    packageInfo: PackageInfo;
    packageInputStreams: RegistryStreamWithDataStream[];
    packagePolicyInput: NewPackagePolicyInput;
    updatePackagePolicyInput: (updatedInput: Partial<NewPackagePolicyInput>) => void;
    inputValidationResults: PackagePolicyInputValidationResults;
    forceShowErrors?: boolean;
    isSingleInputAndStreams?: boolean;
    isEditPage?: boolean;
    isUpgrade?: boolean;
    varGroupSelections?: Record<string, string>;
}>;

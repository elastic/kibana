import React from 'react';
import type { PackageInfo } from '../../../../types';
export interface PackagePolicyEditorDatastreamMappingsProps {
    packageInfo: PackageInfo;
    packageInputStream: {
        id?: string;
        data_stream: {
            dataset: string;
            type: string;
        };
    };
    customDataset?: string;
}
export declare const PackagePolicyEditorDatastreamMappings: React.FunctionComponent<PackagePolicyEditorDatastreamMappingsProps>;

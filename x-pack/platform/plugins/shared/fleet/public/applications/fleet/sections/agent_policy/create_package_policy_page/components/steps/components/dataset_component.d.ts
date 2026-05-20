import React from 'react';
import type { DataStream } from '../../../../../../../../../common/types';
interface SelectedDataset {
    dataset: string;
    package: string;
}
export declare const DatasetComponent: React.FC<{
    value?: SelectedDataset | string;
    onChange: (newValue: SelectedDataset) => void;
    datastreams: DataStream[];
    pkgName?: string;
    isDisabled?: boolean;
    fieldLabel: string;
    description?: string;
    errors?: string[] | null;
    isInvalid?: boolean;
}>;
export {};

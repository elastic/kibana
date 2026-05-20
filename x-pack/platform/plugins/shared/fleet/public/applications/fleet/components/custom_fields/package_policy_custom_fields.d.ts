import React from 'react';
import type { NewPackagePolicy } from '../../types';
interface Props {
    packagePolicy: NewPackagePolicy;
    updatePackagePolicy: (u: Partial<NewPackagePolicy>) => void;
    isDisabled?: boolean;
}
export declare const PackagePolicyCustomFields: React.FunctionComponent<Props>;
export {};

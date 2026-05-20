import React from 'react';
import type { EditPackagePolicyFrom } from '../create_package_policy_page/types';
export declare const EditPackagePolicyPage: React.MemoExoticComponent<() => React.JSX.Element>;
export declare const EditPackagePolicyForm: React.NamedExoticComponent<{
    packagePolicyId: string;
    forceUpgrade?: boolean;
    from?: EditPackagePolicyFrom;
    policyId?: string;
}>;

import React from 'react';
import type { SerializedPolicy } from '@kbn/index-lifecycle-management-common-shared';
export interface IlmPolicyJsonTabProps {
    policyName: string;
    policy: SerializedPolicy;
}
export declare const IlmPolicyJsonTab: ({ policyName, policy }: IlmPolicyJsonTabProps) => React.JSX.Element;

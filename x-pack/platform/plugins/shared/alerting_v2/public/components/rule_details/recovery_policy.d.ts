import React from 'react';
import type { RuleApiResponse } from '../../services/rules_api';
interface RecoveryPolicyProps {
    recoveryPolicy: RuleApiResponse['recovery_policy'];
}
export declare const RecoveryPolicy: ({ recoveryPolicy }: RecoveryPolicyProps) => React.JSX.Element;
export {};

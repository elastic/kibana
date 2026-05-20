import type { EuiStepProps } from '@elastic/eui';
import type { EnrollmentSettingsFleetServerPolicy } from '../../../types';
export declare const getSelectAgentPolicyStep: ({ policyId, setPolicyId, eligibleFleetServerPolicies, refreshEligibleFleetServerPolicies, }: {
    policyId?: string;
    setPolicyId: (v?: string) => void;
    eligibleFleetServerPolicies: EnrollmentSettingsFleetServerPolicy[];
    refreshEligibleFleetServerPolicies: () => void;
}) => EuiStepProps;

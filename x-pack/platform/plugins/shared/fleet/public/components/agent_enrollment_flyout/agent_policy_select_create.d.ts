import React from 'react';
import type { EnrollmentSettingsFleetServerPolicy } from '../../types';
interface Props {
    agentPolicies: EnrollmentSettingsFleetServerPolicy[];
    selectedPolicyId?: string;
    setSelectedPolicyId: (agentPolicyId?: string) => void;
    excludeFleetServer?: boolean;
    withKeySelection: boolean;
    selectedApiKeyId?: string;
    onKeyChange?: (key?: string) => void;
    isFleetServerPolicy?: boolean;
    refreshAgentPolicies: () => void;
}
export declare const SelectCreateAgentPolicy: React.FC<Props>;
export {};

import React from 'react';
import type { AgentPolicy } from '../../types';
type Props = {
    agentPolicies: Array<Pick<AgentPolicy, 'id' | 'name' | 'supports_agentless'>>;
    selectedPolicyId?: string;
    setSelectedPolicyId: (agentPolicyId?: string) => void;
    excludeFleetServer?: boolean;
    onClickCreatePolicy: () => void;
    isFleetServerPolicy?: boolean;
} & ({
    withKeySelection: true;
    selectedApiKeyId?: string;
    onKeyChange?: (key?: string) => void;
} | {
    withKeySelection: false;
});
export declare const AgentPolicySelection: React.FC<Props>;
export {};

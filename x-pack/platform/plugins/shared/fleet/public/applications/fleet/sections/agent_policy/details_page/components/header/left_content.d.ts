import React from 'react';
import type { AgentPolicy } from '../../../../../types';
interface HeaderLeftContentProps {
    isLoading: boolean;
    policyId: string;
    agentPolicy?: AgentPolicy | null;
}
export declare const HeaderLeftContent: React.FunctionComponent<HeaderLeftContentProps>;
export {};

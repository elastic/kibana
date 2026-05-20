import React from 'react';
interface Props {
    policyId?: string;
    troubleshootLink: string;
    onClickViewAgents?: () => void;
    agentCount: number;
    showLoading?: boolean;
    isLongEnrollment?: boolean;
    isCollector?: boolean;
}
interface UsePollingAgentCountOptions {
    noLowerTimeLimit?: boolean;
    pollImmediately?: boolean;
}
/**
 * Hook for finding agents enrolled since component was rendered. Should be
 * used by parent component to power rendering
 * @param policyId
 * @returns agentIds
 */
export declare const usePollingAgentCount: (policyId: string, opts?: UsePollingAgentCountOptions) => {
    enrolledAgentIds: string[];
};
export declare const ConfirmAgentEnrollment: React.FunctionComponent<Props>;
export {};

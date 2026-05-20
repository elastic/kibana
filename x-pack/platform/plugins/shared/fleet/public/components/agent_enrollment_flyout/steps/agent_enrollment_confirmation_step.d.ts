import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
export declare const AgentEnrollmentConfirmationStep: ({ selectedPolicyId, troubleshootLink, onClickViewAgents, agentCount, showLoading, poll, isLongEnrollment, isCollector, }: {
    selectedPolicyId?: string;
    troubleshootLink: string;
    onClickViewAgents?: () => void;
    agentCount: number;
    poll?: boolean;
    showLoading?: boolean;
    isLongEnrollment?: boolean;
    isCollector?: boolean;
}) => EuiContainedStepProps;

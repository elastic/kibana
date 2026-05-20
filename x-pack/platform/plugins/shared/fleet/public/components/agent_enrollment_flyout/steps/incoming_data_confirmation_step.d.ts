import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';
import type { InstalledIntegrationPolicy } from '../use_get_agent_incoming_data';
export declare const IncomingDataConfirmationStep: ({ agentIds, installedPolicy, agentDataConfirmed, setAgentDataConfirmed, troubleshootLink, }: {
    agentIds: string[];
    installedPolicy?: InstalledIntegrationPolicy;
    agentDataConfirmed: boolean;
    setAgentDataConfirmed: (v: boolean) => void;
    troubleshootLink: string;
}) => EuiContainedStepProps;

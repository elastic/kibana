import React from 'react';
import type { InstalledIntegrationPolicy } from './use_get_agent_incoming_data';
interface Props {
    agentIds: string[];
    installedPolicy?: InstalledIntegrationPolicy;
    agentDataConfirmed: boolean;
    setAgentDataConfirmed: (v: boolean) => void;
    troubleshootLink: string;
}
export declare const ConfirmIncomingData: React.FunctionComponent<Props>;
export {};

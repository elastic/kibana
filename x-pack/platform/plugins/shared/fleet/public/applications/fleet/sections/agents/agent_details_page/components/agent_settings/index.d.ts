import React from 'react';
import type { Agent, AgentPolicy } from '../../../../../types';
interface AgentSettingsProps {
    agent: Agent;
    agentPolicy: AgentPolicy | undefined;
}
export declare const AgentSettings: React.FunctionComponent<AgentSettingsProps>;
export {};

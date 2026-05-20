import React from 'react';
import type { OutputsForAgentPolicy } from '../../../../../../../../server/types';
import type { Agent, AgentPolicy } from '../../../../../types';
export declare const AgentDetailsIntegrations: React.FunctionComponent<{
    agent: Agent;
    agentPolicy?: AgentPolicy;
    linkToLogs?: boolean;
    outputs?: OutputsForAgentPolicy;
}>;

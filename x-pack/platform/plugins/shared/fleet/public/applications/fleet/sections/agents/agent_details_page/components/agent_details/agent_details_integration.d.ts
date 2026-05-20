import React from 'react';
import type { OutputsForAgentPolicy } from '../../../../../../../../server/types';
import type { Agent, AgentPolicy, PackagePolicy } from '../../../../../types';
export declare const AgentDetailsIntegration: React.FunctionComponent<{
    agent: Agent;
    agentPolicy: AgentPolicy;
    outputs?: OutputsForAgentPolicy;
    packagePolicy: PackagePolicy;
    linkToLogs: boolean;
    'data-test-subj'?: string;
}>;

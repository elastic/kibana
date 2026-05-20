import React from 'react';
import type { OutputsForAgentPolicy } from '../../../../../../../../server/types';
import type { Agent, PackagePolicy } from '../../../../../types';
export declare const AgentDetailsIntegrationOutputs: React.FunctionComponent<{
    agent: Agent;
    packagePolicy: PackagePolicy;
    outputs?: OutputsForAgentPolicy;
    linkToLogs?: boolean;
    'data-test-subj'?: string;
}>;

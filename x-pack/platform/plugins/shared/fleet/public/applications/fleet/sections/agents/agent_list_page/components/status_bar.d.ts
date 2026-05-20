import React from 'react';
import type { SimplifiedAgentStatus } from '../../../../types';
export declare const AgentStatusBar: React.FC<{
    agentStatus: {
        [k in SimplifiedAgentStatus]: number;
    };
}>;

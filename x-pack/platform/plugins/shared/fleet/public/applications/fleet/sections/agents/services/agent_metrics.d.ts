import React from 'react';
import type { AgentMetrics, AgentPolicy } from '../../../../../../common/types';
export declare function formatAgentCPU(metrics?: AgentMetrics, agentPolicy?: AgentPolicy): React.JSX.Element;
export declare function formatAgentMemory(metrics?: AgentMetrics, agentPolicy?: AgentPolicy): string | React.JSX.Element;
export declare function formatBytes(bytes: number, decimals?: number): string;

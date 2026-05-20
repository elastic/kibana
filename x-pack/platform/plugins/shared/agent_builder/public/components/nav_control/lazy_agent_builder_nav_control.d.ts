import React from 'react';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { AgentBuilderStartDependencies } from '../../types';
import type { AgentBuilderPluginStart } from '../../types';
interface AgentBuilderNavControlInitiatorProps {
    coreStart: CoreStart;
    pluginsStart: AgentBuilderStartDependencies;
    agentBuilderService: AgentBuilderPluginStart;
}
export declare const AgentBuilderNavControlInitiator: ({ coreStart, pluginsStart, agentBuilderService, }: AgentBuilderNavControlInitiatorProps) => React.JSX.Element | null;
export {};

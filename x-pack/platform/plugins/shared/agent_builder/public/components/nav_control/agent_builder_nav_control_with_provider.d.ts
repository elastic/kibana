import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { AgentBuilderStartDependencies } from '../../types';
import type { AgentBuilderPluginStart } from '../../types';
interface AgentBuilderNavControlWithProviderDeps {
    coreStart: CoreStart;
    pluginsStart: AgentBuilderStartDependencies;
    agentBuilderService: AgentBuilderPluginStart;
}
export declare const AgentBuilderNavControlWithProvider: ({ coreStart, pluginsStart, agentBuilderService, }: AgentBuilderNavControlWithProviderDeps) => React.JSX.Element;
export {};

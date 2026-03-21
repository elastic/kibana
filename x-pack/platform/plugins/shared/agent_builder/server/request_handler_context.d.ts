import type { IRouter, CustomRequestHandlerContext, CoreSetup } from '@kbn/core/server';
import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';
import type { AgentBuilderPluginStart, AgentBuilderStartDependencies } from './types';
export interface AgentBuilderRequestHandlerContext {
    spaces: {
        getSpaceId: () => string;
    };
}
export type AgentBuilderHandlerContext = CustomRequestHandlerContext<{
    licensing: LicensingApiRequestHandlerContext;
    agentBuilder: AgentBuilderRequestHandlerContext;
}>;
export type AgentBuilderRouter = IRouter<AgentBuilderHandlerContext>;
export declare const registerAgentBuilderHandlerContext: ({ coreSetup, }: {
    coreSetup: CoreSetup<AgentBuilderStartDependencies, AgentBuilderPluginStart>;
}) => void;

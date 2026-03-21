import type { ZodObject } from '@kbn/zod/v4';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { StaticToolRegistration, ToolRegistry } from '@kbn/agent-builder-server/tools';
import type { AnyToolTypeDefinition } from './tool_types';
import type { ToolHealthClient } from './health';
export interface ToolsServiceSetup {
    register<RunInput extends ZodObject<any>>(tool: StaticToolRegistration<RunInput>): void;
}
export interface ToolsServiceStart {
    /**
     * Create a registry scoped to the current user and context.
     */
    getRegistry(opts: {
        request: KibanaRequest;
    }): Promise<ToolRegistry>;
    /**
     * Returns the list of available tool definitions.
     */
    getToolDefinitions(): AnyToolTypeDefinition[];
    /**
     * Create a health client scoped to the current space.
     * Used to track and query tool health state.
     */
    getHealthClient(opts: {
        request: KibanaRequest;
    }): ToolHealthClient;
}

import type { StaticToolRegistration } from '@kbn/agent-builder-server/tools';
export interface BuiltinToolRegistry {
    register(tool: StaticToolRegistration<any>): void;
    has(toolId: string): boolean;
    get(toolId: string): StaticToolRegistration | undefined;
    list(): StaticToolRegistration[];
}
export declare const createBuiltinToolRegistry: () => BuiltinToolRegistry;

import type { InternalToolDefinition } from '@kbn/agent-builder-server';
import type { RouteDependencies } from './types';
export declare function filterToolsByNamespace(tools: InternalToolDefinition[], namespaces?: string): InternalToolDefinition[];
export declare function registerMCPRoutes({ router, getInternalServices, logger }: RouteDependencies): void;

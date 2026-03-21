import type { Logger } from '@kbn/logging';
import type { AgentProfileStorage } from './client/storage';
import type { AgentsUsingToolsResult } from './types';
export interface ToolRefCleanupParams {
    storage: AgentProfileStorage;
    spaceId: string;
    toolIds: string[];
    logger?: Logger;
    checkOnly?: boolean;
}
export type ToolRefCleanupRunResult = AgentsUsingToolsResult;
export declare function runToolRefCleanup({ storage, spaceId, toolIds, logger, checkOnly, }: ToolRefCleanupParams): Promise<ToolRefCleanupRunResult>;

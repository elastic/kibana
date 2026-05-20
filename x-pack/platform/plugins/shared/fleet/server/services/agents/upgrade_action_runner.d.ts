import type { ElasticsearchClient } from '@kbn/core/server';
import type { Agent } from '../../types';
import { ActionRunner } from './action_runner';
import type { GetAgentsOptions } from './crud';
import { BulkActionTaskType } from './bulk_action_types';
export declare class UpgradeActionRunner extends ActionRunner {
    protected processAgents(agents: Agent[]): Promise<{
        actionId: string;
    }>;
    protected getTaskType(): BulkActionTaskType;
    protected getActionType(): string;
}
export declare function upgradeBatch(esClient: ElasticsearchClient, givenAgents: Agent[], outgoingErrors: Record<Agent['id'], Error>, options: ({
    agents: Agent[];
} | GetAgentsOptions) & {
    actionId?: string;
    version: string;
    sourceUri?: string | undefined;
    force?: boolean;
    skipRateLimitCheck?: boolean;
    upgradeDurationSeconds?: number;
    startTime?: string;
    total?: number;
    isAutomatic?: boolean;
}, spaceIds?: string[]): Promise<{
    actionId: string;
}>;
export declare const MINIMUM_EXECUTION_DURATION_SECONDS: number;
export declare const EXPIRATION_DURATION_SECONDS: number;
export declare const getRollingUpgradeOptions: (startTime?: string, upgradeDurationSeconds?: number) => {
    start_time: string;
    rollout_duration_seconds: number;
    minimum_execution_duration: number;
    expiration: string;
} | {
    start_time: string;
    minimum_execution_duration: number;
    expiration: string;
    rollout_duration_seconds?: undefined;
} | {
    start_time?: undefined;
    rollout_duration_seconds?: undefined;
    minimum_execution_duration?: undefined;
    expiration?: undefined;
};

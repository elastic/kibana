import type { ElasticsearchClient } from '@kbn/core/server';
import type { RequestDiagnosticsAdditionalMetrics } from '../../../common/types';
import type { Agent } from '../../types';
import { ActionRunner } from './action_runner';
import { BulkActionTaskType } from './bulk_action_types';
export declare class RequestDiagnosticsActionRunner extends ActionRunner {
    protected processAgents(agents: Agent[]): Promise<{
        actionId: string;
    }>;
    protected getTaskType(): BulkActionTaskType;
    protected getActionType(): string;
}
export declare function requestDiagnosticsBatch(esClient: ElasticsearchClient, givenAgents: Agent[], options: {
    actionId?: string;
    total?: number;
    additionalMetrics?: RequestDiagnosticsAdditionalMetrics[];
    spaceId?: string;
}): Promise<{
    actionId: string;
}>;

import type { ScopedModel } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ToolEventEmitter, ToolHandlerResult } from '@kbn/agent-builder-server';
import type { TimeRange } from '@kbn/agent-builder-common';
export declare const runSearchTool: ({ nlQuery, index, rowLimit, customInstructions, timeRange, model, esClient, logger, events, }: {
    nlQuery: string;
    index?: string;
    rowLimit?: number;
    customInstructions?: string;
    timeRange?: TimeRange;
    model: ScopedModel;
    esClient: ElasticsearchClient;
    logger: Logger;
    events: ToolEventEmitter;
}) => Promise<ToolHandlerResult[]>;

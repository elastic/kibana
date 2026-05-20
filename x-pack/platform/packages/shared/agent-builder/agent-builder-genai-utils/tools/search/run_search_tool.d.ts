import type { ScopedModel } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ToolEventEmitter, ToolHandlerResult } from '@kbn/agent-builder-server';
import type { TimeRange } from '@kbn/agent-builder-common';
import type { TopSnippetsConfig } from '../steps/extract_snippets';
export declare const runSearchTool: ({ nlQuery, index, rowLimit, customInstructions, allowPatternTarget, timeRange, model, esClient, logger, events, topSnippetsConfig, }: {
    nlQuery: string;
    index?: string;
    rowLimit?: number;
    customInstructions?: string;
    /** When true, a pattern (e.g. logs-*) targets all matching indices via ESQL. When false, a single index is chosen via index explorer. */
    allowPatternTarget?: boolean;
    timeRange?: TimeRange;
    model: ScopedModel;
    esClient: ElasticsearchClient;
    logger: Logger;
    events: ToolEventEmitter;
    topSnippetsConfig?: TopSnippetsConfig;
}) => Promise<ToolHandlerResult[]>;

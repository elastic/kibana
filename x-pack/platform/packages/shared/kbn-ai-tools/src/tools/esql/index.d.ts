import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { BoundInferenceClient, ToolCallbacksOfToolOptions, ToolDefinition } from '@kbn/inference-common';
import type { PromptCompositeResponse, PromptOptions } from '@kbn/inference-common/src/prompt/api';
import { EsqlPrompt } from './prompt';
export declare function executeAsEsqlAgent<TTools extends Record<string, ToolDefinition> | undefined>(options: {
    inferenceClient: BoundInferenceClient;
    esClient: ElasticsearchClient;
    logger: Logger;
    start?: number;
    end?: number;
    signal: AbortSignal;
    prompt: string;
} & (TTools extends Record<string, ToolDefinition> ? {
    toolCallbacks: ToolCallbacksOfToolOptions<{
        tools: TTools;
    }>;
} : {})): PromptCompositeResponse<PromptOptions<typeof EsqlPrompt> & {
    tools: TTools;
    stream: false;
}>;

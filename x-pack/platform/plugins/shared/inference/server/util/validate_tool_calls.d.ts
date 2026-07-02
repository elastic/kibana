import type { ToolOptions, UnvalidatedToolCall } from '@kbn/inference-common';
import type { ToolCallOfToolOptions } from '@kbn/inference-common';
export declare function validateToolCalls<TToolOptions extends ToolOptions>({ toolCalls, toolChoice, tools, }: TToolOptions & {
    toolCalls: UnvalidatedToolCall[];
}): ToolCallOfToolOptions<TToolOptions>[];

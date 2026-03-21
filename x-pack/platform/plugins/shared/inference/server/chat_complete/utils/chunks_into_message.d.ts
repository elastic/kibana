import type { ChatCompletionChunkEvent, ChatCompletionMessageEvent, ChatCompletionTokenCountEvent, ToolOptions } from '@kbn/inference-common';
import type { Logger } from '@kbn/logging';
import type { OperatorFunction } from 'rxjs';
export declare function chunksIntoMessage<TToolOptions extends ToolOptions>({ logger, toolOptions, }: {
    toolOptions: TToolOptions;
    logger: Pick<Logger, 'debug'>;
}): OperatorFunction<ChatCompletionChunkEvent | ChatCompletionTokenCountEvent, ChatCompletionChunkEvent | ChatCompletionTokenCountEvent | ChatCompletionMessageEvent<TToolOptions>>;

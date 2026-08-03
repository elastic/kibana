import type { OperatorFunction } from 'rxjs';
import type { ChatCompletionChunkEvent, ChatCompletionTokenCountEvent } from '@kbn/inference-common';
export declare function processOpenAIStream(): OperatorFunction<string, ChatCompletionChunkEvent | ChatCompletionTokenCountEvent>;

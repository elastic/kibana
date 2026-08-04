import type OpenAI from 'openai';
import type { OperatorFunction } from 'rxjs';
import type { ChatCompletionChunkEvent, ChatCompletionTokenCountEvent } from '@kbn/inference-common';
export declare function processOpenAIResponse(): OperatorFunction<OpenAI.ChatCompletion, ChatCompletionChunkEvent | ChatCompletionTokenCountEvent>;

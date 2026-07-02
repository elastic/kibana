import type OpenAI from 'openai';
import type { ChatCompletionChunkEvent, ChatCompletionTokenCountEvent } from '@kbn/inference-common';
export declare function chunkFromOpenAI(chunk: OpenAI.ChatCompletionChunk): ChatCompletionChunkEvent;
export declare function tokenCountFromOpenAI(completionUsage: OpenAI.CompletionUsage, model?: string): ChatCompletionTokenCountEvent;
export declare function chunkFromCompletionResponse(completion: OpenAI.ChatCompletion): ChatCompletionChunkEvent;

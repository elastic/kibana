import type { ChatCompletionChunkEvent, ChatCompletionTokenCountEvent } from '@kbn/inference-common';
import { AIMessageChunk } from '@langchain/core/messages';
export declare const completionChunkToLangchain: (chunk: ChatCompletionChunkEvent) => AIMessageChunk;
export declare const tokenCountChunkToLangchain: (chunk: ChatCompletionTokenCountEvent) => AIMessageChunk;

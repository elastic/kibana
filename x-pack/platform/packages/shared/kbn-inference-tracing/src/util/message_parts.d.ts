import type { GenAIMessagePart, GenAITextPart, GenAIToolCallPart, GenAIToolCallResponsePart } from '../types';
export declare function isTextPart(part: GenAIMessagePart): part is GenAITextPart;
export declare function isToolCallPart(part: GenAIMessagePart): part is GenAIToolCallPart;
export declare function isToolCallResponsePart(part: GenAIMessagePart): part is GenAIToolCallResponsePart;

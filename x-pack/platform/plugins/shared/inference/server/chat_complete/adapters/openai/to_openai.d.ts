import type OpenAI from 'openai';
import type { Message, ToolOptions, InferenceConnector } from '@kbn/inference-common';
export declare function toolsToOpenAI(tools: ToolOptions['tools']): OpenAI.ChatCompletionCreateParams['tools'];
export declare function toolChoiceToOpenAI(toolChoice: ToolOptions['toolChoice'], context?: {
    connector?: InferenceConnector;
    tools?: ToolOptions['tools'];
}): OpenAI.ChatCompletionCreateParams['tool_choice'];
export declare function messagesToOpenAI({ system, messages, }: {
    system?: string;
    messages: Message[];
}): OpenAI.ChatCompletionMessageParam[];

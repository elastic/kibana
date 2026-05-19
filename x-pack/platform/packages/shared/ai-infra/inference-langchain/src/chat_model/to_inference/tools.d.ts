import { type BindToolsInput } from '@langchain/core/language_models/chat_models';
import type { ToolDefinition as ToolDefinitionInference, ToolChoice as ToolChoiceInference } from '@kbn/inference-common';
import type { ToolChoice } from '../types';
export declare const toolDefinitionToInference: (tools: BindToolsInput[]) => Record<string, ToolDefinitionInference>;
export declare const toolChoiceToInference: (toolChoice: ToolChoice) => ToolChoiceInference;

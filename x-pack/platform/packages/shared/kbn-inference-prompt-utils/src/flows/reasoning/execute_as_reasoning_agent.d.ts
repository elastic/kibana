import type { PromptOptions, ToolCallbacksOfToolOptions, ToolChoice, ToolNamesOf, ToolOptionsOfPrompt, UnboundPromptOptions } from '@kbn/inference-common';
import { type Prompt } from '@kbn/inference-common';
import type { ReasoningPromptOptions, ReasoningPromptResponseOf } from './types';
export declare function executeAsReasoningAgent<TPrompt extends Prompt, TPromptOptions extends PromptOptions<TPrompt>, TToolCallbacks extends ToolCallbacksOfToolOptions<ToolOptionsOfPrompt<TPrompt>>, TFinalToolChoice extends ToolChoice<ToolNamesOf<ToolOptionsOfPrompt<TPrompt>>> | undefined = ToolChoice<ToolNamesOf<ToolOptionsOfPrompt<TPrompt>>> | undefined>(options: UnboundPromptOptions<TPrompt> & ReasoningPromptOptions & {
    prompt: TPrompt;
} & {
    toolCallbacks: TToolCallbacks;
    finalToolChoice?: TFinalToolChoice;
}): Promise<ReasoningPromptResponseOf<TPrompt, TPromptOptions & {
    toolChoice: TFinalToolChoice;
}, TToolCallbacks>>;

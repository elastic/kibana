import type { Model, Prompt, PromptVersion } from '@kbn/inference-common';
import type { ChatCompleteOptions } from '@kbn/inference-common';
interface PromptToMessageOptionsResult {
    match: PromptVersion;
    options: Pick<ChatCompleteOptions, 'messages' | 'system' | 'tools' | 'toolChoice' | 'temperature'>;
}
export declare function promptToMessageOptions(prompt: Prompt, input: unknown, model: Partial<Model>): PromptToMessageOptionsResult;
export {};

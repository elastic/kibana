import type { BoundOptions, UnboundOptions } from '../bind/bind_api';
import type { PromptOptions, PromptAPIResponse } from './api';
import type { Prompt } from './types';
/**
 * Options used to call the {@link BoundPromptAPI}
 */
export type UnboundPromptOptions<TPrompt extends Prompt = Prompt> = UnboundOptions<PromptOptions<TPrompt>>;
/**
 * Version of {@link PromptAPI} that got pre-bound to a set of static parameters
 */
export type BoundPromptAPI = <TPrompt extends Prompt, TPromptOptions extends UnboundPromptOptions<TPrompt>>(options: {
    prompt: TPrompt;
} & TPromptOptions) => PromptAPIResponse<BoundOptions & TPromptOptions>;

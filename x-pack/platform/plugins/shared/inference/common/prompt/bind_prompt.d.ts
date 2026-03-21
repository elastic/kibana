import type { BoundPromptAPI, BoundOptions, PromptAPI } from '@kbn/inference-common';
/**
 * Bind prompt to the provided parameters,
 * returning a bound version of the API.
 */
export declare function bindPrompt(promptApi: PromptAPI, boundParams: BoundOptions): BoundPromptAPI;

import type { PromptAPI } from '@kbn/inference-common';
import type { HttpHandler } from '@kbn/core/public';
interface PublicInferenceClientCreateOptions {
    fetch: HttpHandler;
    signal?: AbortSignal;
}
export declare function createPromptRestApi(options: PublicInferenceClientCreateOptions): PromptAPI;
export {};

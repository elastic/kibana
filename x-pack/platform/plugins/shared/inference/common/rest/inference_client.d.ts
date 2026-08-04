import type { HttpHandler } from '@kbn/core/public';
import type { InferenceClient } from '@kbn/inference-common';
export declare function createInferenceRestClient({ fetch, signal, }: {
    fetch: HttpHandler;
    signal?: AbortSignal;
}): InferenceClient;

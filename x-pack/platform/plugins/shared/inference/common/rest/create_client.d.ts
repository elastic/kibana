import type { BoundInferenceClient, BoundOptions, InferenceClient } from '@kbn/inference-common';
import type { HttpHandler } from '@kbn/core/public';
interface RestOptions {
    fetch: HttpHandler;
    signal?: AbortSignal;
}
interface BoundRestOptions extends RestOptions {
    bindTo: BoundOptions;
}
export declare function createRestClient(options: RestOptions): InferenceClient;
export declare function createRestClient(options: BoundRestOptions): BoundInferenceClient;
export {};

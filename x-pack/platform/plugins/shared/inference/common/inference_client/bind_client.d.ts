import type { BoundInferenceClient, InferenceClient } from '@kbn/inference-common';
import type { BoundOptions } from '@kbn/inference-common';
export declare const bindClient: (unboundClient: InferenceClient, boundParams: BoundOptions) => BoundInferenceClient;

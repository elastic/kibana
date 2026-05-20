import type { HttpSetup } from '@kbn/core-http-browser';
export declare const isInferenceEndpointExists: (http: HttpSetup, inferenceEndpointId: string) => Promise<boolean>;

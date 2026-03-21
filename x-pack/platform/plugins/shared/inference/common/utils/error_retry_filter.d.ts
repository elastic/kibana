import { type ChatCompleteRetryConfiguration } from '@kbn/inference-common';
export declare const getRetryFilter: (retryOn?: ChatCompleteRetryConfiguration["retryOn"]) => ((err: Error) => boolean);

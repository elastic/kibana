import type { OperatorFunction } from 'rxjs';
import type { InferenceTaskEvent } from '@kbn/inference-common';
import type { StreamedHttpResponse } from './create_observable_from_http_response';
export declare function httpResponseIntoObservable<T extends InferenceTaskEvent = never>(): OperatorFunction<StreamedHttpResponse, T>;

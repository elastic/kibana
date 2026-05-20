import type { OperatorFunction, Observable } from 'rxjs';
import type { Readable } from 'stream';
import type { InferenceInvokeResult } from './inference_executor';
export declare function handleConnectorStreamResponse<T>({ processStream, }: {
    processStream: (stream: Readable) => Observable<T>;
}): OperatorFunction<InferenceInvokeResult, T>;
export declare function handleConnectorDataResponse<T>({ parseData, }: {
    parseData: (data: unknown) => T;
}): OperatorFunction<InferenceInvokeResult, T>;

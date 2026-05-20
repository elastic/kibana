import type { PayloadAction } from '@reduxjs/toolkit';
import type { HttpSetup, HttpFetchOptions } from '@kbn/core/public';
/**
 * Async thunk to start the stream.
 */
export declare const startStream: import("@reduxjs/toolkit").AsyncThunk<void, {
    http: HttpSetup;
    endpoint: string;
    apiVersion?: string;
    abortCtrl: React.MutableRefObject<AbortController>;
    body?: any;
    headers?: HttpFetchOptions["headers"];
}, {
    state?: unknown;
    dispatch?: import("redux").Dispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
}>;
export interface StreamState {
    errors: string[];
    isCancelled: boolean;
    isRunning: boolean;
}
export declare const streamSlice: import("@reduxjs/toolkit").Slice<StreamState, {
    addError: (state: StreamState, action: PayloadAction<string>) => void;
    cancelStream: (state: StreamState) => void;
}, "stream">;
export declare const addError: import("@reduxjs/toolkit").ActionCreatorWithPayload<string, "stream/addError">, cancelStream: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"stream/cancelStream">;

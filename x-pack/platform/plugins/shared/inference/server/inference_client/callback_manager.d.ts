import type { InferenceCompleteCallbackHandler, InferenceErrorCallbackHandler, InferenceCallbacks } from '@kbn/inference-common/src/chat_complete';
import type { InferenceEventEmitter } from '@kbn/inference-common';
export interface InferenceCallbackManager {
    onComplete: InferenceCompleteCallbackHandler;
    onError: InferenceErrorCallbackHandler;
    asEventEmitter: () => InferenceEventEmitter;
}
export declare const createCallbackManager: (cbs?: InferenceCallbacks) => InferenceCallbackManager;

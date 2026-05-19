import type { OperatorFunction } from 'rxjs';
import type { ChatCompletionEvent } from '@kbn/inference-common';
import type { InferenceCallbackManager } from '../../inference_client/callback_manager';
export declare function handleLifecycleCallbacks({ callbackManager, }: {
    callbackManager: InferenceCallbackManager;
}): OperatorFunction<ChatCompletionEvent, ChatCompletionEvent>;

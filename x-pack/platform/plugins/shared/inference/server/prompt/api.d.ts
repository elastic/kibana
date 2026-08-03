import type { PromptAPI } from '@kbn/inference-common';
import type { ChatCompleteApiWithCallback } from '../chat_complete/callback_api';
export declare function createPromptApi(opts: {
    callbackApi: ChatCompleteApiWithCallback;
}): PromptAPI;

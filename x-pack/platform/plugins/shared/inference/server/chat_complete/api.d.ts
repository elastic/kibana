import type { ChatCompleteAPI } from '@kbn/inference-common';
import type { ChatCompleteApiWithCallback } from './callback_api';
export declare function createChatCompleteApi(opts: {
    callbackApi: ChatCompleteApiWithCallback;
}): ChatCompleteAPI;

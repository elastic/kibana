import type { ChatCompleteAPI, BoundChatCompleteAPI, BoundOptions } from '@kbn/inference-common';
/**
 * Bind chatComplete to the provided parameters,
 * returning a bound version of the API.
 */
export declare function bindChatComplete(chatComplete: ChatCompleteAPI, boundParams: BoundOptions): BoundChatCompleteAPI;

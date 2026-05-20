import type { HttpHandler } from '@kbn/core/public';
import type { ChatCompleteAPI } from '@kbn/inference-common';
export declare function createChatCompleteRestApi({ fetch, signal, }: {
    fetch: HttpHandler;
    signal?: AbortSignal;
}): ChatCompleteAPI;

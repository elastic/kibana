import type { ChatCompleteResponse, ChatCompleteStreamResponse, ToolOptions } from '@kbn/inference-common';
export declare const streamToResponse: <TToolOptions extends ToolOptions = ToolOptions>(streamResponse$: ChatCompleteStreamResponse<TToolOptions>) => Promise<ChatCompleteResponse<TToolOptions>>;

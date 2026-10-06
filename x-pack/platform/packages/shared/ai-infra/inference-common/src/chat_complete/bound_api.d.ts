import type { BoundOptions, UnboundOptions } from '../bind/bind_api';
import type { ChatCompleteOptions, ChatCompleteAPIResponse } from './api';
/**
 * Options used to call the {@link BoundChatCompleteAPI}
 */
export type UnboundChatCompleteOptions = UnboundOptions<ChatCompleteOptions>;
/**
 * Version of {@link ChatCompleteAPI} that got pre-bound to a set of static parameters
 */
export type BoundChatCompleteAPI = <TChatCompleteOptions extends UnboundChatCompleteOptions>(options: TChatCompleteOptions) => ChatCompleteAPIResponse<TChatCompleteOptions & BoundOptions>;

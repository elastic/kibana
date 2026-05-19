import type { OperatorFunction } from 'rxjs';
import type { MessageOrChatEvent } from '../../../../common/conversation_complete';
export declare function catchFunctionNotFoundError(functionLimitExceeded: boolean): OperatorFunction<MessageOrChatEvent, MessageOrChatEvent>;

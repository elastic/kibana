import type { OperatorFunction } from 'rxjs';
import type { Message } from '../../../../common';
import type { MessageOrChatEvent } from '../../../../common/conversation_complete';
export declare function extractMessages(): OperatorFunction<MessageOrChatEvent, Message[]>;

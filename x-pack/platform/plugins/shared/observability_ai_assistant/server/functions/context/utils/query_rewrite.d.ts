import type { Logger } from '@kbn/logging';
import type { Message } from '../../../../common';
import type { FunctionCallChatFunction } from '../../../service/types';
export declare function queryRewrite({ screenDescription, chat, messages, logger, signal, }: {
    screenDescription: string;
    chat: FunctionCallChatFunction;
    messages: Message[];
    logger: Logger;
    signal: AbortSignal;
}): Promise<string>;

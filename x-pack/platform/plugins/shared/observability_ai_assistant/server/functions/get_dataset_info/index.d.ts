import type { Message } from '../../../common';
import type { FunctionRegistrationParameters } from '..';
import type { FunctionCallChatFunction, RespondFunctionResources } from '../../service/types';
export declare function registerGetDatasetInfoFunction({ resources, functions, }: FunctionRegistrationParameters): void;
export declare function getDatasetInfo({ resources, indexPattern, signal, messages, chat, }: {
    resources: RespondFunctionResources;
    indexPattern: string;
    signal: AbortSignal;
    messages: Message[];
    chat: FunctionCallChatFunction;
}): Promise<{
    indices: string[];
    fields: never[];
    stats?: undefined;
} | {
    indices: string[];
    fields: string[];
    stats: {
        analyzed: number;
        total: number;
    };
}>;

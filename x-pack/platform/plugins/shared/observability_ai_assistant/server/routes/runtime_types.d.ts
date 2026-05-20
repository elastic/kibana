import * as t from 'io-ts';
import { type ConversationCreateRequest, type ConversationUpdateRequest, type Message, type ObservabilityAIAssistantScreenContextRequest, type StarterPrompt } from '../../common/types';
export declare const deanonymizationRt: t.TypeC<{
    start: t.NumberC;
    end: t.NumberC;
    entity: t.TypeC<{
        class_name: t.StringC;
        value: t.StringC;
        mask: t.StringC;
    }>;
}>;
export declare const messageRt: t.Type<Message>;
export declare const publicMessageRt: t.Type<Omit<Message, 'unredactions'>>;
export declare const conversationCreateRt: t.Type<ConversationCreateRequest>;
export declare const assistantScopeType: t.UnionC<[t.LiteralC<"observability">, t.LiteralC<"search">, t.LiteralC<"all">]>;
export declare const conversationUpdateRt: t.Type<ConversationUpdateRequest>;
export declare const functionRt: t.IntersectionC<[t.TypeC<{
    name: t.StringC;
    description: t.StringC;
}>, t.PartialC<{
    parameters: t.AnyC;
}>]>;
export declare const starterPromptRt: t.Type<StarterPrompt>;
export declare const screenContextRt: t.Type<ObservabilityAIAssistantScreenContextRequest>;

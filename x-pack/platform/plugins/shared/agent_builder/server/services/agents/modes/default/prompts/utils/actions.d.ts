import type { BaseMessageLike } from '@langchain/core/messages';
import type { ResearchAgentAction, AnswerAgentAction } from '../../actions';
export declare const formatResearcherActionHistory: ({ actions, }: {
    actions: ResearchAgentAction[];
}) => BaseMessageLike[];
export declare const formatAnswerActionHistory: ({ actions, }: {
    actions: AnswerAgentAction[];
}) => BaseMessageLike[];

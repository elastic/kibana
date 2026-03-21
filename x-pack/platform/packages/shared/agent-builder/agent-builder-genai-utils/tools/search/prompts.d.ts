import type { BaseMessageLike } from '@langchain/core/messages';
import type { SearchTarget } from './types';
export declare const getSearchPrompt: ({ nlQuery, searchTarget, customInstructions, }: {
    nlQuery: string;
    searchTarget: SearchTarget;
    customInstructions?: string;
}) => BaseMessageLike[];

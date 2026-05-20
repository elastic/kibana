import type { BaseMessageLike } from '@langchain/core/messages';
import type { ResourceDescriptor } from '../index_explorer';
export declare const getSearchDispatcherPrompt: ({ nlQuery, resources, customInstructions, }: {
    nlQuery: string;
    resources: ResourceDescriptor[];
    customInstructions?: string;
}) => BaseMessageLike[];

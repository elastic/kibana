import type { TagsHandlerContext } from '../../../types';
import type { TagResponseItem } from '../schemas';
export declare const upsert: (requestContext: TagsHandlerContext, id: string, upsertBody: {
    name: string;
    description?: string;
    color?: string;
}) => Promise<TagResponseItem>;

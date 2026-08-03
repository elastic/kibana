import type { TagResponseItem } from '../schemas';
import type { TagsHandlerContext } from '../../../types';
export declare const read: (requestContext: TagsHandlerContext, id: string) => Promise<TagResponseItem>;

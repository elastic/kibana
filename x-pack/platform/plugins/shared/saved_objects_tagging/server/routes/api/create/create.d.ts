import type { TagsHandlerContext } from '../../../types';
import type { TagResponseItem } from '../schemas';
export declare const create: (requestContext: TagsHandlerContext, createBody: {
    name: string;
    description?: string;
    color?: string;
}) => Promise<{
    outcome: "created";
    body: TagResponseItem;
} | {
    outcome: "conflict";
    message: string;
}>;

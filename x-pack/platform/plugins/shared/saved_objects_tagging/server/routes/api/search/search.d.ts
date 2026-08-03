import type { TagsHandlerContext } from '../../../types';
import type { TagsSearchRequestQuery, TagsSearchResponseBody } from '../schemas';
export declare const search: (requestContext: TagsHandlerContext, requestQuery: TagsSearchRequestQuery) => Promise<TagsSearchResponseBody>;

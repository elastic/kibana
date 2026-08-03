import type { SavedObjectsTaggingApiUi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { ITagsCache } from '../services';
export interface BuildParseSearchQueryOptions {
    cache: ITagsCache;
}
export declare const buildParseSearchQuery: ({ cache, }: BuildParseSearchQueryOptions) => SavedObjectsTaggingApiUi["parseSearchQuery"];

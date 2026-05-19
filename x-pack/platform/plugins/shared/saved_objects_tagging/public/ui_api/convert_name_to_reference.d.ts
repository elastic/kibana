import type { SavedObjectsTaggingApiUi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { ITagsCache } from '../services';
export interface BuildConvertNameToReferenceOptions {
    cache: ITagsCache;
}
export declare const buildConvertNameToReference: ({ cache, }: BuildConvertNameToReferenceOptions) => SavedObjectsTaggingApiUi["convertNameToReference"];

import type { SavedObjectsTaggingApiUi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { Tag } from '../../common/types';
export interface BuildGetSearchBarFilterOptions {
    getTagList: () => Tag[];
}
export declare const buildGetSearchBarFilter: ({ getTagList, }: BuildGetSearchBarFilterOptions) => SavedObjectsTaggingApiUi["getSearchBarFilter"];

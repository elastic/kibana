import type { SavedObjectsTaggingApiUi, SavedObjectsTaggingApiUiComponent } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { ITagsCache } from '../services';
export interface BuildGetTableColumnDefinitionOptions {
    components: SavedObjectsTaggingApiUiComponent;
    cache: ITagsCache;
}
export declare const buildGetTableColumnDefinition: ({ components, cache, }: BuildGetTableColumnDefinitionOptions) => SavedObjectsTaggingApiUi["getTableColumnDefinition"];

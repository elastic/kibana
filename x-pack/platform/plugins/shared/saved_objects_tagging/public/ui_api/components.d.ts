import type { SavedObjectsTaggingApiUiComponent } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { TagsCapabilities } from '../../common';
import type { ITagInternalClient, ITagsCache } from '../services';
import type { StartServices } from '../types';
export interface GetComponentsOptions extends StartServices {
    capabilities: TagsCapabilities;
    cache: ITagsCache;
    tagClient: ITagInternalClient;
}
export declare const getComponents: ({ capabilities, cache, tagClient, ...startServices }: GetComponentsOptions) => SavedObjectsTaggingApiUiComponent;

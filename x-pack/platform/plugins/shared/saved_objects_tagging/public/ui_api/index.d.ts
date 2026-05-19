import type { SavedObjectsTaggingApiUi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { TagsCapabilities } from '../../common';
import type { ITagsCache, ITagInternalClient } from '../services';
import type { StartServices } from '../types';
interface GetUiApiOptions extends StartServices {
    capabilities: TagsCapabilities;
    cache: ITagsCache;
    client: ITagInternalClient;
}
export declare const getUiApi: ({ cache, capabilities, client, ...startServices }: GetUiApiOptions) => SavedObjectsTaggingApiUi;
export {};

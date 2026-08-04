import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
export type SavedObjectTaggingPluginStart = SavedObjectsTaggingApi;
export type StartServices = Pick<CoreStart, 'overlays' | 'notifications' | 'rendering'>;

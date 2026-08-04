import type { SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';
import type { HttpStart } from '@kbn/core/public';
import type { LensSavedObjectAttributes, LensAttributesService } from '@kbn/lens-common';
export declare const savedObjectToEmbeddableAttributes: (savedObject: SavedObjectCommon<LensSavedObjectAttributes>) => LensSavedObjectAttributes;
export declare function getLensAttributeService(http: HttpStart): LensAttributesService;

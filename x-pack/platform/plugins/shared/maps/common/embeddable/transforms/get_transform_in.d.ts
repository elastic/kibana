import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import type { Reference } from '@kbn/content-management-utils';
import type { MapEmbeddableState } from '../types';
import type { StoredMapEmbeddableState } from './types';
export declare const MAP_SAVED_OBJECT_REF_NAME = "savedObjectRef";
export declare function getTransformIn(transformDrilldownsIn: DrilldownTransforms['transformIn']): (state: MapEmbeddableState) => {
    state: StoredMapEmbeddableState;
    references: Reference[];
};

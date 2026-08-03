import type { LensInspectorAdapters } from '@kbn/lens-common';
import type { LensEmbeddableStartServices } from '../types';
export declare function initializeInspector(services: LensEmbeddableStartServices): {
    api: LensInspectorAdapters;
};

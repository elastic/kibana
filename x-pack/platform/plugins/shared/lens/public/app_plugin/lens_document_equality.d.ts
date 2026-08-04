import type { FilterManager } from '@kbn/data-plugin/public';
import type { LensDocument, AnnotationGroups, DatasourceMap, VisualizationMap } from '@kbn/lens-common';
export declare const isLensEqual: (doc1In: LensDocument | undefined, doc2In: LensDocument | undefined, injectFilterReferences: FilterManager["inject"], datasourceMap: DatasourceMap, visualizationMap: VisualizationMap, annotationGroups: AnnotationGroups) => boolean;

import type { CoreStart } from '@kbn/core/public';
import type { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import type { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import type { LayerAction, RegisterLibraryAnnotationGroupFunction, LensStartServices as StartServices, StateSetter } from '@kbn/lens-common';
import type { XYVisualizationState, XYAnnotationLayerConfig } from '../../types';
export declare const createAnnotationActions: ({ state, layer, setState, registerLibraryAnnotationGroup, core, isSaveable, eventAnnotationService, savedObjectsTagging, dataViews, startServices, }: {
    state: XYVisualizationState;
    layer: XYAnnotationLayerConfig;
    setState: StateSetter<XYVisualizationState, unknown>;
    registerLibraryAnnotationGroup: RegisterLibraryAnnotationGroupFunction;
    core: CoreStart;
    isSaveable?: boolean;
    eventAnnotationService: EventAnnotationServiceType;
    savedObjectsTagging?: SavedObjectTaggingPluginStart;
    dataViews: DataViewsContract;
    startServices: StartServices;
}) => LayerAction[];

import type { PaletteRegistry } from '@kbn/coloring';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { CoreStart, ThemeServiceStart } from '@kbn/core/public';
import type { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
import type { EventAnnotationGroupConfig } from '@kbn/event-annotation-common';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { Visualization, XYPersistedState } from '@kbn/lens-common';
import type { XYVisualizationState } from './types';
export type ExtraAppendLayerArg = EventAnnotationGroupConfig & {
    annotationGroupId: string;
};
export declare const getXyVisualization: ({ core, storage, data, paletteService, fieldFormats, kibanaTheme, eventAnnotationService, unifiedSearch, dataViewsService, savedObjectsTagging, }: {
    core: CoreStart;
    storage: IStorageWrapper;
    data: DataPublicPluginStart;
    paletteService: PaletteRegistry;
    eventAnnotationService: EventAnnotationServiceType;
    fieldFormats: FieldFormatsStart;
    kibanaTheme: ThemeServiceStart;
    unifiedSearch: UnifiedSearchPublicPluginStart;
    dataViewsService: DataViewsPublicPluginStart;
    savedObjectsTagging?: SavedObjectTaggingPluginStart;
}) => Visualization<XYVisualizationState, XYPersistedState, ExtraAppendLayerArg>;
export declare const stackingTypes: {
    type: string;
    label: string;
    subtypes: string[];
    dataTestSubj: string;
}[];

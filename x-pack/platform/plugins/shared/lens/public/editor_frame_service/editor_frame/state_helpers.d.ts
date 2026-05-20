import type { Reference } from '@kbn/content-management-utils';
import type { IUiSettingsClient, HttpStart } from '@kbn/core/public';
import type { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import type { DataViewsContract, DataViewSpec } from '@kbn/data-views-plugin/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { DataPublicPluginStart, TimefilterContract } from '@kbn/data-plugin/public';
import type { EventAnnotationServiceType } from '@kbn/event-annotation-plugin/public';
import { type EventAnnotationGroupConfig } from '@kbn/event-annotation-common';
import type { Datasource, DatasourceMap, IndexPattern, IndexPatternMap, IndexPatternRef, InitializationOptions, VisualizationMap, VisualizeEditorContext, DatasourceState, DatasourceStates, VisualizationState, DocumentToExpressionReturnType, LensDocument } from '@kbn/lens-common';
export declare function initializeDataViews({ dataViews, datasourceMap, datasourceStates, storage, defaultIndexPatternId, references, initialContext, adHocDataViews: persistedAdHocDataViews, annotationGroups, }: {
    dataViews: DataViewsContract;
    datasourceMap: DatasourceMap;
    datasourceStates: DatasourceStates;
    defaultIndexPatternId: string;
    storage: IStorageWrapper;
    references?: Reference[];
    initialContext?: VisualizeFieldContext | VisualizeEditorContext;
    adHocDataViews?: Record<string, DataViewSpec>;
    annotationGroups: Record<string, EventAnnotationGroupConfig>;
}, options?: InitializationOptions): Promise<{
    indexPatternRefs: IndexPatternRef[];
    indexPatterns: Record<string, IndexPattern>;
}>;
/**
 * This function composes both initializeDataViews & initializeDatasources into a single call
 */
export declare function initializeSources({ dataViews, eventAnnotationService, datasourceMap, visualizationMap, visualizationState, datasourceStates, storage, defaultIndexPatternId, references, initialContext, adHocDataViews, http, }: {
    dataViews: DataViewsContract;
    eventAnnotationService: EventAnnotationServiceType;
    datasourceMap: DatasourceMap;
    visualizationMap: VisualizationMap;
    visualizationState: VisualizationState;
    datasourceStates: DatasourceStates;
    defaultIndexPatternId: string;
    storage: IStorageWrapper;
    references?: Reference[];
    initialContext?: VisualizeFieldContext | VisualizeEditorContext;
    adHocDataViews?: Record<string, DataViewSpec>;
    http?: HttpStart;
}, options?: InitializationOptions): Promise<{
    indexPatterns: Record<string, IndexPattern>;
    indexPatternRefs: IndexPatternRef[];
    annotationGroups: Record<string, EventAnnotationGroupConfig>;
    datasourceStates: DatasourceStates;
    visualizationState: unknown;
}>;
export declare function initializeVisualization({ visualizationMap, visualizationState, datasourceStates, references, annotationGroups, }: {
    visualizationState: VisualizationState;
    visualizationMap: VisualizationMap;
    datasourceStates: DatasourceStates;
    references?: Reference[];
    initialContext?: VisualizeFieldContext | VisualizeEditorContext;
    annotationGroups: Record<string, EventAnnotationGroupConfig>;
}): unknown;
export declare function initializeDatasources({ datasourceMap, datasourceStates, indexPatternRefs, indexPatterns, references, initialContext, }: {
    datasourceMap: DatasourceMap;
    datasourceStates: DatasourceStates;
    indexPatterns: Record<string, IndexPattern>;
    indexPatternRefs: IndexPatternRef[];
    references?: Reference[];
    initialContext?: VisualizeFieldContext | VisualizeEditorContext;
}): DatasourceStates;
export declare function persistedStateToExpression(datasourceMap: DatasourceMap, visualizations: VisualizationMap, doc: LensDocument, services: {
    uiSettings: IUiSettingsClient;
    storage: IStorageWrapper;
    dataViews: DataViewsContract;
    timefilter: TimefilterContract;
    nowProvider: DataPublicPluginStart['nowProvider'];
    eventAnnotationService: EventAnnotationServiceType;
    forceDSL?: boolean;
    http?: HttpStart;
}): Promise<DocumentToExpressionReturnType>;
export declare function getMissingIndexPattern(currentDatasource: Datasource | null | undefined, currentDatasourceState: DatasourceState | null, indexPatterns: IndexPatternMap): string[];

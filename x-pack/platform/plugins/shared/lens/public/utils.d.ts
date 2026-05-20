import { type ColorMapping } from '@kbn/coloring';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { Reference } from '@kbn/content-management-utils';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';
import type { DatatableUtilitiesService } from '@kbn/data-plugin/common';
import type { RequestAdapter } from '@kbn/inspector-plugin/common';
import type { ISearchStart } from '@kbn/data-plugin/public';
import type { DraggingIdentifier, DropType } from '@kbn/dom-drag-drop';
import type { LensDocument, DateRange, Datasource, DatasourceMap, Visualization, IndexPatternMap, IndexPatternRef, DraggedField, DragDropOperation, UserMessage, DatasourceStates, VisualizationState, TriggerEvent } from '@kbn/lens-common';
import type { LensDatasourceId } from '@kbn/lens-common';
import type { IndexPatternServiceAPI } from './data_views_service/service';
export declare function getVisualizeGeoFieldMessage(fieldType: string): string;
export declare function getResolvedDateRange(timefilter: TimefilterContract): {
    fromDate: string;
    toDate: string;
};
export declare function getAbsoluteDateRange(timefilter: TimefilterContract): {
    fromDate: string;
    toDate: string;
};
export declare function convertToAbsoluteDateRange(dateRange: DateRange, now: Date): {
    fromDate: string;
    toDate: string;
};
export declare function containsDynamicMath(dateMathString: string): boolean;
export declare function getTimeZone(uiSettings: IUiSettingsClient): any;
export declare function getActiveDatasourceIdFromDoc(doc?: LensDocument): LensDatasourceId | null;
export declare function getActiveVisualizationIdFromDoc(doc?: LensDocument): string | null;
export declare function getInitialDatasourceId(datasourceMap: DatasourceMap, doc?: LensDocument): string | null;
export declare function getInitialDataViewsObject(indexPatterns: IndexPatternMap, indexPatternRefs: IndexPatternRef[]): {
    indexPatterns: IndexPatternMap;
    indexPatternRefs: IndexPatternRef[];
};
export declare function refreshIndexPatternsList({ activeDatasources, indexPatternService, indexPatternId, indexPatternsCache, }: {
    indexPatternService: IndexPatternServiceAPI;
    activeDatasources: Record<string, Datasource>;
    indexPatternId: string;
    indexPatternsCache: IndexPatternMap;
}): Promise<void>;
export declare function extractReferencesFromState({ activeDatasourceId, activeDatasources, datasourceStates, visualizationState, activeVisualization, }: {
    activeDatasourceId: string | null;
    activeDatasources: DatasourceMap;
    datasourceStates: DatasourceStates;
    visualizationState: unknown;
    activeVisualization?: Visualization;
}): Reference[];
export declare function getIndexPatternsIds({ activeDatasourceId, activeDatasources, datasourceStates, visualizationState, activeVisualization, }: {
    activeDatasourceId: string | null;
    activeDatasources: Record<string, Datasource>;
    datasourceStates: DatasourceStates;
    visualizationState: unknown;
    activeVisualization?: Visualization;
}): string[];
export declare function getIndexPatternsObjects(ids: string[], dataViews: DataViewsContract): Promise<{
    indexPatterns: DataView[];
    rejectedIds: string[];
}>;
export declare function getRemoveOperation(activeVisualization: Visualization, visualizationState: VisualizationState['state'], layerId: string, layerCount: number): "remove" | "clear";
export declare function inferTimeField(datatableUtilities: DatatableUtilitiesService, event: TriggerEvent): string | ({
    rowIndex: number;
    table: import("@kbn/expressions-plugin/common").Datatable;
    columns?: string[];
} | import("@kbn/alerts-ui-shared").AlertRuleFromVisUIActionData)[] | undefined;
export declare function renewIDs<T = unknown>(obj: T, forRenewIds: string[], getNewId: (id: string) => string | undefined): T;
/**
 * The dimension container is set up to close when it detects a click outside it.
 * Use this CSS class to exclude particular elements from this behavior.
 */
export declare const DONT_CLOSE_DIMENSION_CONTAINER_ON_CLICK_CLASS = "lensDontCloseDimensionContainerOnClick";
export declare function isDraggedField(fieldCandidate: unknown): fieldCandidate is DraggedField;
export declare function isDraggedDataViewField(fieldCandidate: unknown): fieldCandidate is DraggedField;
export declare const isOperationFromCompatibleGroup: (op1?: DraggingIdentifier, op2?: DragDropOperation) => boolean;
export declare const isOperationFromTheSameGroup: (op1?: DraggingIdentifier, op2?: DragDropOperation) => boolean;
export declare const sortDataViewRefs: (dataViewRefs: IndexPatternRef[]) => IndexPatternRef[];
export declare const getSearchWarningMessages: (adapter: RequestAdapter, datasource: Datasource, state: unknown, deps: {
    searchService: ISearchStart;
}) => UserMessage[];
export declare function getUniqueLabelGenerator(): (label: string) => string;
export declare function nonNullable<T>(v: T): v is NonNullable<T>;
export declare function reorderElements<S>(items: S[], targetId: S, sourceId: S): S[];
export declare function shouldRemoveSource(source: unknown, dropType: DropType): source is DragDropOperation;
export declare const getColorMappingDefaults: (options?: {
    defaultPaletteId?: ColorMapping.Config["paletteId"];
}) => {
    paletteId: import("@kbn/palettes").KbnPaletteId;
    specialAssignments: Array<ColorMapping.AssignmentBase<ColorMapping.RuleOthers, ColorMapping.CategoricalColor | ColorMapping.ColorCode | ColorMapping.LoopColor>>;
    colorMode: ColorMapping.CategoricalColorMode | ColorMapping.GradientColorMode;
    assignments: Array<ColorMapping.AssignmentBase<ColorMapping.ColorRule, ColorMapping.CategoricalColor | ColorMapping.ColorCode | ColorMapping.GradientColor>>;
} | undefined;
export declare const EXPRESSION_BUILD_ERROR_ID = "expression_build_error";

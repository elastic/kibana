import type { FilterManager } from '@kbn/data-plugin/public';
import type { VisualizationMap, DatasourceMap, TypedLensSerializedState, LensDatasourceId } from '@kbn/lens-common';
export declare function getStateManagementForInlineEditing(initialDatasourceId: LensDatasourceId, getAttributes: () => TypedLensSerializedState['attributes'], updateAttributes: (newAttributes: TypedLensSerializedState['attributes'], resetId?: boolean) => void, visualizationMap: VisualizationMap, datasourceMap: DatasourceMap, extractFilterReferences: FilterManager['extract']): {
    updateSuggestion: (newAttributes: TypedLensSerializedState["attributes"], resetId?: boolean) => void;
    updatePanelState: (datasourceState: unknown, visualizationState: unknown, visualizationType?: string, datasourceId?: LensDatasourceId) => void;
};

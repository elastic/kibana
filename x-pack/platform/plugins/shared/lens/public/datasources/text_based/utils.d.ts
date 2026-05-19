import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { DatatableColumn } from '@kbn/expressions-plugin/public';
import type { ValueFormatConfig, IndexPatternRef, TextBasedPrivateState, TextBasedLayerColumn, TextBasedLayer } from '@kbn/lens-common';
export declare const MAX_NUM_OF_COLUMNS = 10;
export declare function loadIndexPatternRefs(indexPatternsService: DataViewsPublicPluginStart): Promise<IndexPatternRef[]>;
export declare const getAllColumns: (existingColumns: TextBasedLayerColumn[], columnsFromQuery: DatatableColumn[]) => (TextBasedLayerColumn | {
    variable?: string | undefined;
    columnId: string;
    fieldName: string;
    label: string;
    meta: import("@kbn/expressions-plugin/common").DatatableColumnMeta;
})[];
export declare const isNumeric: (column: TextBasedLayerColumn | DatatableColumn) => boolean;
export declare const isNotNumeric: (column: TextBasedLayerColumn | DatatableColumn) => boolean;
export declare function canColumnBeDroppedInMetricDimension(columns: TextBasedLayerColumn[] | DatatableColumn[], selectedColumnType?: string): boolean;
export declare function canColumnBeUsedBeInMetricDimension(columns: TextBasedLayerColumn[] | DatatableColumn[], selectedColumnType?: string): boolean;
export declare function mergeLayer({ state, layerId, newLayer, }: {
    state: TextBasedPrivateState;
    layerId: string;
    newLayer: Partial<TextBasedLayer>;
}): {
    layers: {
        [x: string]: TextBasedLayer | {
            index?: string;
            query?: import("@kbn/es-query").AggregateQuery | undefined;
            table?: import("@kbn/expressions-plugin/public").Datatable;
            columns: TextBasedLayerColumn[];
            timeField?: string;
            errors?: Error[];
            ignoreGlobalFilters?: boolean;
        };
    };
    initialContext?: import("@kbn/ui-actions-plugin/public").VisualizeFieldContext | import("@kbn/lens-common").VisualizeEditorContext;
    indexPatternRefs: IndexPatternRef[];
};
export declare function updateColumnLabel({ layer, columnId, value, }: {
    layer: TextBasedLayer;
    columnId: string;
    value: string;
}): TextBasedLayer;
export declare function updateColumnFormat({ layer, columnId, value, }: {
    layer: TextBasedLayer;
    columnId: string;
    value: ValueFormatConfig | undefined;
}): TextBasedLayer;

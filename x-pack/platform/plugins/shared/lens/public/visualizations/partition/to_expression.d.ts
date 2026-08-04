import type { Ast } from '@kbn/interpreter';
import type { PaletteRegistry } from '@kbn/coloring';
import type { LensPartitionLayerState, LensPartitionVisualizationState, DatasourcePublicAPI, DatasourceLayers } from '@kbn/lens-common';
export declare const getColumnToLabelMap: (columnIds: string[], datasource: DatasourcePublicAPI | undefined) => Record<string, string>;
export declare const getSortedAccessorsForGroup: (datasource: DatasourcePublicAPI | undefined, layer: LensPartitionLayerState, accessor: "primaryGroups" | "secondaryGroups" | "metrics") => string[];
export declare function toExpression(state: LensPartitionVisualizationState, datasourceLayers: DatasourceLayers, paletteService: PaletteRegistry, attributes?: Partial<{
    title: string;
    description: string;
}>, datasourceExpressionsByLayers?: Record<string, Ast> | undefined): Ast | null;
export declare function toPreviewExpression(state: LensPartitionVisualizationState, datasourceLayers: DatasourceLayers, paletteService: PaletteRegistry, datasourceExpressionsByLayers?: Record<string, Ast> | undefined): Ast | null;

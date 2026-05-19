import type { Filter } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { GenericIndexPatternColumn, TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { CombinedQuery } from '../../../../index_data_visualizer/types/combined_query';
import type { FieldVisConfig } from '../../stats_table/types';
export declare function getNumberSettings(item: FieldVisConfig, defaultDataView: DataView): {
    columns: Record<string, GenericIndexPatternColumn>;
    layer: import("@kbn/lens-plugin/public").XYDataLayerConfig;
};
export declare function getDateSettings(item: FieldVisConfig): {
    columns: Record<string, GenericIndexPatternColumn>;
    layer: import("@kbn/lens-plugin/public").XYDataLayerConfig;
};
export declare function getKeywordSettings(item: FieldVisConfig): {
    columns: Record<string, GenericIndexPatternColumn>;
    layer: import("@kbn/lens-plugin/public").XYDataLayerConfig;
};
export declare function getBooleanSettings(item: FieldVisConfig): {
    columns: Record<string, GenericIndexPatternColumn>;
    layer: import("@kbn/lens-plugin/public").XYDataLayerConfig;
};
export declare function getCompatibleLensDataType(type: FieldVisConfig['type']): string | undefined;
export declare function getLensAttributes(defaultDataView: DataView | undefined, combinedQuery: CombinedQuery, filters: Filter[], item: FieldVisConfig): TypedLensByValueInput['attributes'] | undefined;

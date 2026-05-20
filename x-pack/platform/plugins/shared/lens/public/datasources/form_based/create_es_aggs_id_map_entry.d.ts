import type { IUiSettingsClient } from '@kbn/core/public';
import type { DateRange, FormBasedLayer, IndexPattern, ValueFormatConfig, GenericIndexPatternColumn } from '@kbn/lens-common';
import type { OriginalColumn } from '../../../common/types';
export interface CreateEsAggsIdMapEntryParams {
    col: GenericIndexPatternColumn;
    colId: string;
    layer: FormBasedLayer;
    indexPattern: IndexPattern;
    uiSettings: IUiSettingsClient;
    dateRange: DateRange;
    /** Format configuration for the column (accepts ValueFormatConfig or serialized format) */
    format?: ValueFormatConfig | Record<string, unknown>;
    /** Interval for date histogram buckets (in ms) */
    interval?: number;
    /** Whether to include sourceField in the output (for bucket columns) */
    includeSourceField?: boolean;
}
/**
 * Creates an entry for the esAggsIdMap with consistent structure.
 * Used for metrics, buckets, and static values in ES|QL conversion.
 */
export declare function createEsAggsIdMapEntry({ col, colId, layer, indexPattern, format, interval, uiSettings, dateRange, includeSourceField, }: CreateEsAggsIdMapEntryParams): OriginalColumn[];

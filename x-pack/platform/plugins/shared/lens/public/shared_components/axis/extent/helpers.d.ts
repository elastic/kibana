import type { Datatable } from '@kbn/expressions-plugin/common';
import type { YScaleType, XScaleType } from '@kbn/expression-xy-plugin/common';
import type { DatasourcePublicAPI } from '@kbn/lens-common';
import type { UnifiedAxisExtentConfig } from './types';
/**
 * Returns true if the provided extent includes 0
 * @param extent
 * @returns boolean
 */
export declare function validateZeroInclusivityExtent(extent?: {
    lowerBound?: number;
    upperBound?: number;
}): boolean | undefined;
/**
 * Returns true if the provided extent includes 0
 * @param extent
 * @returns boolean
 */
export declare function validateLogarithmicExtent(extent?: {
    lowerBound?: number;
    upperBound?: number;
}): boolean | undefined;
/**
 * Returns true if the provided extent is a valid range
 * @param extent
 * @returns boolean
 */
export declare function validateAxisDomain(extents?: {
    lowerBound?: number;
    upperBound?: number;
}): boolean | undefined;
/**
 * Returns true if the provided column is a numeric histogram dimension
 * @param extent
 * @returns boolean
 */
export declare function hasNumericHistogramDimension(datasourceLayer: DatasourcePublicAPI | undefined, columnId?: string): boolean;
/**
 * Finds the table data min and max. Returns undefined when no min/max is found
 * @param layerId
 * @param tables
 * @param columnId
 * @returns
 */
export declare function getDataBounds(layerId: string, tables: Record<string, Datatable> | undefined, columnId?: string): {
    min: any;
    max: any;
} | undefined;
export declare function validateExtent(hasBarOrArea: boolean, extent: UnifiedAxisExtentConfig, scaleType?: YScaleType | XScaleType): {
    helpMsg?: string;
    errorMsg?: string;
};

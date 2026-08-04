import type { ColorMapping } from '@kbn/coloring';
import type { DeprecatedColorMappingConfig } from './types';
import type { ColumnMeta } from './utils';
/**
 * Converts old stringified colorMapping configs to new raw value configs
 */
export declare function convertToRawColorMappings(colorMapping: DeprecatedColorMappingConfig | ColorMapping.Config, columnMeta?: ColumnMeta | null): ColorMapping.Config;
export declare function isDeprecatedColorMapping<T extends DeprecatedColorMappingConfig | ColorMapping.Config>(colorMapping?: T): colorMapping is Exclude<T, ColorMapping.Config>;

import type { ColorMapping } from '@kbn/coloring';
import type { DeprecatedColorMappingConfig } from './types';
import type { ColumnMeta } from './utils';
/**
 * Converts old stringified colorMapping configs to new raw value configs
 *
 * Also fixes loop mode issue https://github.com/elastic/kibana/issues/231165
 */
export declare function convertToRawColorMappings({ ...colorMapping }: DeprecatedColorMappingConfig | ColorMapping.Config, columnMeta?: ColumnMeta | null): ColorMapping.Config;
export declare function isDeprecatedColorMapping<T extends DeprecatedColorMappingConfig | ColorMapping.Config>(colorMapping?: T): colorMapping is Exclude<T, ColorMapping.Config>;

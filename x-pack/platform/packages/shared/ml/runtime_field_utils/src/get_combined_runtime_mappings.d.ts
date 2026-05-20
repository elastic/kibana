import type { DataView } from '@kbn/data-views-plugin/common';
import { type RuntimeMappings } from './is_runtime_mappings';
/**
 * Return a map of runtime_mappings for each of the data view field provided
 * to provide in ES search queries
 * @param {DataView | undefined} dataView - The Kibana data view.
 * @param runtimeMappings - Optional runtime mappings.
 */
export declare function getCombinedRuntimeMappings(dataView: DataView | undefined, runtimeMappings?: RuntimeMappings): RuntimeMappings | undefined;

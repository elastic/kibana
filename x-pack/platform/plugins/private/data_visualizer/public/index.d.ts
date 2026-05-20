import type { PluginInitializerContext } from '@kbn/core/public';
import { DataVisualizerPlugin } from './plugin';
export declare function plugin(initializerContext: PluginInitializerContext): DataVisualizerPlugin;
export type { DataVisualizerPluginStart } from './plugin';
export type { IndexDataVisualizerSpec, IndexDataVisualizerViewProps, DataDriftSpec, } from './application';
export { getFieldsStatsGrid } from './application/common/components/fields_stats_grid';

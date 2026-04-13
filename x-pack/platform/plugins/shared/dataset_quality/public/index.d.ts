import { DatasetQualityPlugin } from './plugin';
export type { DataStreamStatServiceResponse } from '../common/data_streams_stats';
export type { DatasetQualityPluginSetup, DatasetQualityPluginStart } from './types';
export { DataStreamsStatsService } from './services/data_streams_stats/data_streams_stats_service';
export type { IDataStreamsStatsClient } from './services/data_streams_stats/types';
export declare function plugin(): DatasetQualityPlugin;
export { DatasetQualityIndicator } from './components/quality_indicator';
export { calculatePercentage } from './utils/calculate_percentage';

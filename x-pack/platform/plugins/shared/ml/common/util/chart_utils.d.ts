import type { SeriesConfigWithMetadata } from '@kbn/ml-common-types/results';
import type { ChartType } from '../constants/charts';
/**
 * Get the chart type based on its configuration
 * @param config
 */
export declare function getChartType(config: SeriesConfigWithMetadata): ChartType;

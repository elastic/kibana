import type { JobId } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { SeriesConfigWithMetadata } from '@kbn/ml-common-types/results';
export interface ExplorerChartSeriesErrorMessages {
    [key: string]: JobId[];
}
export declare interface ExplorerChartsData {
    chartsPerRow: number;
    seriesToPlot: SeriesConfigWithMetadata[];
    tooManyBuckets: boolean;
    timeFieldName: string;
    errorMessages: ExplorerChartSeriesErrorMessages | undefined;
}
export declare function getDefaultChartsData(): ExplorerChartsData;

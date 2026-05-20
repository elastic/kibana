import type { IUiSettingsClient } from '@kbn/core/public';
import type { TimeBuckets } from '@kbn/ml-time-buckets';
import type { AreaSeriesStyle, LineSeriesStyle, RecursivePartial } from '@elastic/charts';
import type { JobCreatorType } from '../../../../common/job_creator';
export declare function useChartColors(): {
    LINE_COLOR: string;
    MODEL_COLOR: string;
    EVENT_RATE_COLOR: string;
    EVENT_RATE_COLOR_WITH_ANOMALIES: string;
};
export interface ChartSettings {
    width: string;
    height: string;
    cols: 1 | 2 | 3;
    intervalMs: number;
}
export declare const defaultChartSettings: ChartSettings;
export declare const lineSeriesStyle: RecursivePartial<LineSeriesStyle>;
export declare const areaSeriesStyle: RecursivePartial<AreaSeriesStyle>;
export declare function getChartSettings(uiSettings: IUiSettingsClient, jobCreator: JobCreatorType, chartInterval: TimeBuckets): {
    intervalMs: number;
    width: string;
    height: string;
    cols: 1 | 2 | 3;
};

import type { FC } from 'react';
import type { MlAnomaliesTableRecord } from '@kbn/ml-anomaly-utils';
import type { CombinedJob } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';
import type { SourceIndicesWithGeoFields } from '../../../explorer/explorer_utils';
import type { CustomRuleEditorSource } from '../../../../../common/constants/usage_collection';
interface TimeSeriesChartWithTooltipsProps {
    bounds: any;
    detectorIndex: number;
    embeddableMode?: boolean;
    renderFocusChartOnly: boolean;
    selectedJob: CombinedJob;
    selectedEntities: Record<string, any>;
    showAnnotations: boolean;
    showForecast: boolean;
    showModelBounds: boolean;
    chartProps: any;
    lastRefresh: number;
    contextAggregationInterval: any;
    tableData?: {
        anomalies: MlAnomaliesTableRecord[];
        interval: string;
    };
    sourceIndicesWithGeoFields: SourceIndicesWithGeoFields;
    telemetrySource: CustomRuleEditorSource;
}
export declare const TimeSeriesChartWithTooltips: FC<TimeSeriesChartWithTooltipsProps>;
export {};

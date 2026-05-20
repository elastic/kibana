import { type DataFrameAnalyticsConfig, type RocCurveItem } from '@kbn/ml-data-frame-analytics-utils';
import type { ResultsSearchQuery } from '../../../../common/analytics';
interface RocCurveDataRow extends RocCurveItem {
    class_name: string;
}
export declare const useRocCurve: (jobConfig: DataFrameAnalyticsConfig, searchQuery: ResultsSearchQuery, columns: string[]) => {
    rocCurveData: RocCurveDataRow[];
    classificationClasses: string[];
    error: string[] | null;
    isLoading: boolean;
};
export {};

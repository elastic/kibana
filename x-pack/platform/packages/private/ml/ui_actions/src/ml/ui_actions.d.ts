import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { TimeRange } from '@kbn/es-query';
export interface CreateCategorizationADJobContext {
    field: DataViewField;
    dataView: DataView;
    query: QueryDslQueryContainer;
    timeRange: TimeRange;
}
export declare const CREATE_PATTERN_ANALYSIS_TO_ML_AD_JOB_ACTION = "createMLADCategorizationJobAction";

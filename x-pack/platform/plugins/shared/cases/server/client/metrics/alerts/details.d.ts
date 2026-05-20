import type { SingleCaseMetricsResponse } from '../../../../common/types/api';
import { SingleCaseAggregationHandler } from '../single_case_aggregation_handler';
import type { SingleCaseBaseHandlerCommonOptions } from '../types';
export declare class AlertDetails extends SingleCaseAggregationHandler {
    constructor(options: SingleCaseBaseHandlerCommonOptions);
    compute(): Promise<SingleCaseMetricsResponse>;
}

import type { SingleCaseMetricsResponse } from '../../../common/types/api';
import { AggregationHandler } from './aggregation_handler';
import type { AggregationBuilder, SingleCaseBaseHandlerCommonOptions } from './types';
export declare abstract class SingleCaseAggregationHandler extends AggregationHandler<SingleCaseMetricsResponse> {
    protected readonly caseId: string;
    constructor(options: SingleCaseBaseHandlerCommonOptions, aggregations: Map<string, AggregationBuilder<SingleCaseMetricsResponse>>);
}

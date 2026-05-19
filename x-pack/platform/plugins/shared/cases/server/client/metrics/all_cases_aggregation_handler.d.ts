import type { CasesMetricsResponse } from '../../../common/types/api';
import { AggregationHandler } from './aggregation_handler';
import type { AggregationBuilder, AllCasesBaseHandlerCommonOptions } from './types';
export declare abstract class AllCasesAggregationHandler extends AggregationHandler<CasesMetricsResponse> {
    protected readonly from?: string;
    protected readonly to?: string;
    protected readonly owner?: string | string[];
    constructor(options: AllCasesBaseHandlerCommonOptions, aggregations: Map<string, AggregationBuilder<CasesMetricsResponse>>);
}

import type { CasesMetricsResponse } from '../../../../common/types/api';
import { AllCasesAggregationHandler } from '../all_cases_aggregation_handler';
import type { AllCasesBaseHandlerCommonOptions } from '../types';
export declare class Status extends AllCasesAggregationHandler {
    constructor(options: AllCasesBaseHandlerCommonOptions);
    compute(): Promise<CasesMetricsResponse>;
}

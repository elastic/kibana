import type { CaseMetricsFeature, SingleCaseMetricsResponse } from '../../../common/types/api';
import { BaseHandler } from './base_handler';
import type { SingleCaseBaseHandlerCommonOptions } from './types';
export declare abstract class SingleCaseBaseHandler extends BaseHandler<SingleCaseMetricsResponse> {
    protected readonly caseId: string;
    constructor(options: SingleCaseBaseHandlerCommonOptions, features?: CaseMetricsFeature[]);
}

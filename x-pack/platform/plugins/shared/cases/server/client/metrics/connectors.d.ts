import type { SingleCaseMetricsResponse } from '../../../common/types/api';
import { SingleCaseBaseHandler } from './single_case_base_handler';
import type { SingleCaseBaseHandlerCommonOptions } from './types';
export declare class Connectors extends SingleCaseBaseHandler {
    constructor(options: SingleCaseBaseHandlerCommonOptions);
    compute(): Promise<SingleCaseMetricsResponse>;
}

import type { SavedObject } from '@kbn/core/server';
import type { UserActionAttributes } from '../../../common/types/domain';
import type { SingleCaseMetricsResponse, StatusInfo } from '../../../common/types/api';
import { SingleCaseBaseHandler } from './single_case_base_handler';
import type { SingleCaseBaseHandlerCommonOptions } from './types';
export declare class Lifespan extends SingleCaseBaseHandler {
    constructor(options: SingleCaseBaseHandlerCommonOptions);
    compute(): Promise<SingleCaseMetricsResponse>;
}
export declare function getStatusInfo(statusUserActions: Array<SavedObject<UserActionAttributes>>, caseOpenTimestamp: Date): StatusInfo;

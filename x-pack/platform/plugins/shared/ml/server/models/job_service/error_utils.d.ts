import { JOB_STATE, DATAFEED_STATE } from '../../../common/constants/states';
import type { JobAction } from '../../../common/constants/job_actions';
type ACTION_STATE = DATAFEED_STATE | JOB_STATE | JobAction;
export declare function isRequestTimeout(error: {
    name: string;
}): boolean;
export interface Results {
    [id: string]: {
        [status: string]: any;
        error?: any;
    };
}
export declare function fillResultsWithTimeouts(results: Results, id: string, ids: string[], status: ACTION_STATE): Results;
export {};

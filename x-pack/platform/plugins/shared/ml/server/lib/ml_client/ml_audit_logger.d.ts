import type { KibanaRequest } from '@kbn/core-http-server';
import type { CoreAuditService } from '@kbn/core/server';
import type { MlClientParams } from './types';
type TaskTypeAD = 'ml_put_ad_job' | 'ml_delete_ad_job' | 'ml_delete_model_snapshot' | 'ml_open_ad_job' | 'ml_close_ad_job' | 'ml_update_ad_job' | 'ml_reset_ad_job' | 'ml_revert_ad_snapshot' | 'ml_put_ad_datafeed' | 'ml_delete_ad_datafeed' | 'ml_start_ad_datafeed' | 'ml_stop_ad_datafeed' | 'ml_update_ad_datafeed' | 'ml_put_calendar' | 'ml_delete_calendar' | 'ml_put_calendar_job' | 'ml_delete_calendar_job' | 'ml_post_calendar_events' | 'ml_delete_calendar_event' | 'ml_put_filter' | 'ml_update_filter' | 'ml_delete_filter' | 'ml_forecast' | 'ml_delete_forecast';
type TaskTypeDFA = 'ml_put_dfa_job' | 'ml_delete_dfa_job' | 'ml_start_dfa_job' | 'ml_stop_dfa_job' | 'ml_update_dfa_job';
type TaskTypeNLP = 'ml_put_trained_model' | 'ml_delete_trained_model' | 'ml_start_trained_model_deployment' | 'ml_stop_trained_model_deployment' | 'ml_update_trained_model_deployment' | 'ml_infer_trained_model';
type TaskType = TaskTypeAD | TaskTypeDFA | TaskTypeNLP;
export declare class MlAuditLogger {
    private auditLogger;
    constructor(audit: CoreAuditService, request?: KibanaRequest);
    wrapTask<T, P extends MlClientParams>(task: () => T, taskType: TaskType, p: P): Promise<T>;
    logMessage(message: string): void;
    private logSuccess;
    private logFailure;
    private createLogEntry;
    private createPartialLogEntry;
}
export {};

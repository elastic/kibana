import type { AuditLogger, IClusterClient, KibanaRequest, KibanaResponseFactory, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { ReportingCore } from '../..';
import type { ListScheduledReportApiJSON, ReportingUser, ScheduledReportApiJson } from '../../types';
import type { BulkOperationError } from './types';
import type { UpdateScheduledReportParams } from './types/update';
interface ListScheduledReportsApiResponse {
    page: number;
    per_page: number;
    total: number;
    data: ListScheduledReportApiJSON[];
}
interface BulkOperationResult {
    scheduled_report_ids: string[];
    errors: BulkOperationError[];
    total: number;
}
export type CreatedAtSearchResponse = SearchResponse<{
    created_at: string;
}>;
export declare class ScheduledReportsService {
    private auditLogger;
    private userCanManageReporting;
    private esClient;
    private logger;
    private responseFactory;
    private savedObjectsClient;
    private taskManager;
    private request;
    constructor(auditLogger: AuditLogger, userCanManageReporting: Boolean, esClient: IClusterClient, logger: Logger, responseFactory: KibanaResponseFactory, savedObjectsClient: SavedObjectsClientContract, taskManager: TaskManagerStartContract, request: KibanaRequest);
    static build({ logger, reportingCore, responseFactory, request, }: {
        logger: Logger;
        reportingCore: ReportingCore;
        responseFactory: KibanaResponseFactory;
        request: KibanaRequest;
    }): Promise<ScheduledReportsService>;
    update({ user, id, updateParams, }: {
        user: ReportingUser;
        id: string;
        updateParams: UpdateScheduledReportParams;
    }): Promise<ScheduledReportApiJson>;
    list({ user, page, size, search, }: {
        user: ReportingUser;
        page: number;
        size: number;
        search?: string;
    }): Promise<ListScheduledReportsApiResponse>;
    bulkDisable({ ids, user, }: {
        ids: string[];
        user: ReportingUser;
    }): Promise<BulkOperationResult>;
    bulkEnable({ ids, user, }: {
        ids: string[];
        user: ReportingUser;
    }): Promise<BulkOperationResult>;
    bulkDelete({ ids, user, }: {
        ids: string[];
        user: ReportingUser;
    }): Promise<BulkOperationResult>;
    private _auditBulkGetAuthorized;
    private _formatAndAuditBulkDeleteAuthErrors;
    private _formatAndAuditBulkDeleteSchedulesErrors;
    private _formatBulkDeleteTaskErrors;
    private _getUsername;
    private _getEmptyListApiResponse;
    private _auditLog;
    private _updateScheduledReportSavedObject;
    private _updateScheduledReportTaskSchedule;
    private _canUpdateReport;
    private _bulkOperation;
    private _updateScheduledReportSavedObjectEnabledState;
    private _addLogForBulkOperationScheduledReports;
    private _updateScheduledReportTaskEnabledState;
    private _throw404;
}
export {};

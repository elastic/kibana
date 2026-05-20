import type { SavedObject, SavedObjectsFindResponse, SavedObjectsFindResult } from '@kbn/core/server';
import type { Logger } from '@kbn/core/server';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { BulkGetResult } from '@kbn/task-manager-plugin/server/task_store';
import type { BulkOperationError } from './types';
import type { ScheduledReportApiJson, ScheduledReportType } from '../../types';
interface ListApiResponse {
    page: number;
    per_page: number;
    total: number;
    data: ScheduledReportApiJson[];
}
export type CreatedAtSearchResponse = SearchResponse<{
    created_at: string;
}>;
export declare function transformSingleResponse(logger: Logger, so: SavedObjectsFindResult<ScheduledReportType> | SavedObject<ScheduledReportType>, lastResponse?: CreatedAtSearchResponse, nextRunResponse?: BulkGetResult): ScheduledReportApiJson;
export declare function transformListResponse(logger: Logger, result: SavedObjectsFindResponse<ScheduledReportType>, lastResponse?: CreatedAtSearchResponse, nextRunResponse?: BulkGetResult): ListApiResponse;
export declare function transformBulkDeleteResponse({ deletedSchedulesIds, errors, }: {
    deletedSchedulesIds: string[];
    errors: BulkOperationError[];
}): {
    scheduled_report_ids: string[];
    errors: BulkOperationError[];
    total: number;
};
export {};

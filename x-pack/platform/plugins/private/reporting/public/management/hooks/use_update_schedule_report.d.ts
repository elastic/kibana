import type { HttpSetup } from '@kbn/core/public';
import type { UpdateScheduleReportRequestParams } from '../apis/update_schedule_report';
export declare const getKey: () => readonly [string, "updateScheduleReport"];
export declare const useUpdateScheduleReport: ({ http }: {
    http: HttpSetup;
}) => import("@kbn/react-query").UseMutationResult<import("../../../server/types").ScheduledReportingJobResponse, unknown, UpdateScheduleReportRequestParams, unknown>;

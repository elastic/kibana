import type { HttpSetup } from '@kbn/core/public';
import type { ScheduleReportRequestParams } from '../apis/schedule_report';
export declare const getKey: () => readonly [string, "scheduleReport"];
export declare const useScheduleReport: ({ http }: {
    http: HttpSetup;
}) => import("@kbn/react-query").UseMutationResult<import("../../../server/types").ScheduledReportingJobResponse, unknown, ScheduleReportRequestParams, unknown>;

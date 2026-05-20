import type { HttpSetup } from '@kbn/core/public';
import { type ScheduledReportApiJSON } from '@kbn/reporting-common/types';
export declare const getScheduledReportsList: ({ http, perPage, page, search, }: {
    http: HttpSetup;
    page?: number;
    perPage?: number;
    search?: string;
}) => Promise<{
    page: number;
    size: number;
    total: number;
    data: ScheduledReportApiJSON[];
}>;

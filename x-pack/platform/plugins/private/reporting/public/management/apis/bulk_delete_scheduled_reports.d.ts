import type { HttpSetup } from '@kbn/core/public';
export declare const bulkDeleteScheduledReports: ({ http, ids, }: {
    http: HttpSetup;
    ids: string[];
}) => Promise<{
    scheduled_report_ids: string[];
    errors: Array<{
        message: string;
        status?: number;
        id: string;
    }>;
    total: number;
}>;

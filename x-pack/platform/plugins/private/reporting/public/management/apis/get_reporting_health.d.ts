import type { HttpSetup } from '@kbn/core/public';
import type { ReportingHealthInfo } from '@kbn/reporting-common/types';
export declare const getReportingHealth: ({ http, }: {
    http: HttpSetup;
}) => Promise<ReportingHealthInfo>;

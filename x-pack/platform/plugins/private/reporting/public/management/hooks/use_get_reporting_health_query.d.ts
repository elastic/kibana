import type { HttpSetup } from '@kbn/core/public';
export declare const getKey: () => readonly ["reporting", "health"];
export declare const useGetReportingHealthQuery: ({ http }: {
    http: HttpSetup;
}) => import("@kbn/react-query").UseQueryResult<import("@kbn/reporting-common/types").ReportingHealthInfo, unknown>;

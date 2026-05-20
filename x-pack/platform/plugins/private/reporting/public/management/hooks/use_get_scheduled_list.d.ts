export declare const getKey: (params: unknown) => readonly ["reporting", "scheduledList", unknown];
interface GetScheduledListQueryProps {
    page?: number;
    perPage?: number;
    search?: string;
}
export declare const useGetScheduledList: (props: GetScheduledListQueryProps) => import("@kbn/react-query").UseQueryResult<{
    page: number;
    size: number;
    total: number;
    data: import("@kbn/reporting-common/types").ScheduledReportApiJSON[];
}, unknown>;
export {};

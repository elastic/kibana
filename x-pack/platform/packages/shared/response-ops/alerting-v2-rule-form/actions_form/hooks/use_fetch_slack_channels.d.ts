export interface SlackChannel {
    id: string;
    name: string;
}
export declare const useFetchSlackChannels: ({ connectorId, enabled, }: {
    connectorId: string | null;
    enabled?: boolean;
}) => import("@tanstack/react-query").UseQueryResult<SlackChannel[], Error>;

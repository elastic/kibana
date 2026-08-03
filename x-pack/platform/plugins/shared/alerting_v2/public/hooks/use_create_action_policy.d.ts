export declare const useCreateActionPolicy: () => import("@tanstack/react-query").UseMutationResult<{
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    destinations: {
        type: "workflow";
        id: string;
    }[];
    matcher: string | null;
    groupBy: string[] | null;
    tags: string[] | null;
    groupingMode: "all" | "per_episode" | "per_field" | null;
    throttle: {
        interval: string | null;
        strategy?: "on_status_change" | "per_status_interval" | "time_interval" | "every_time" | undefined;
    } | null;
    snoozedUntil: string | null;
    auth: {
        owner: string;
        createdByUser: boolean;
    };
    createdBy: string | null;
    createdAt: string;
    updatedBy: string | null;
    updatedAt: string;
    version?: string | undefined;
}, Error, {
    name: string;
    description: string;
    destinations: {
        type: "workflow";
        id: string;
    }[];
    matcher?: string | undefined;
    groupBy?: string[] | undefined;
    tags?: string[] | undefined;
    groupingMode?: "all" | "per_episode" | "per_field" | undefined;
    throttle?: {
        strategy?: "on_status_change" | "per_status_interval" | "time_interval" | "every_time" | undefined;
        interval?: string | null | undefined;
    } | undefined;
}, unknown>;

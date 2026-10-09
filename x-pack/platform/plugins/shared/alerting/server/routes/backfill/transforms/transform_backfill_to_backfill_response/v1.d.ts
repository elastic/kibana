import type { Backfill } from '../../../../application/backfill/result/types';
export declare const transformBackfillToBackfillResponse: (backfill: Backfill) => {
    id: string;
    duration: string;
    enabled: boolean;
    start: string;
    status: "complete" | "error" | "pending" | "running" | "timeout";
    end?: string | undefined;
    warnings?: string[] | undefined;
    created_at: string;
    space_id: import("@kbn/core/packages/spaces/common").SpaceId;
    rule: {
        id: string;
        name: string;
        tags: string[];
        actions: Readonly<{
            uuid?: string | undefined;
            frequency?: Readonly<{} & {
                summary: boolean;
                notifyWhen: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval";
                throttle: string | null;
            }> | undefined;
            alertsFilter?: Readonly<{
                query?: Readonly<{
                    dsl?: string | undefined;
                } & {
                    kql: string;
                    filters: Readonly<{
                        query?: Record<string, any> | undefined;
                        $state?: Readonly<{} & {
                            store: import("@kbn/es-query-constants").FilterStateStore;
                        }> | undefined;
                    } & {
                        meta: Record<string, any>;
                    }>[];
                }> | undefined;
                timeframe?: Readonly<{} & {
                    days: (1 | 2 | 3 | 4 | 5 | 6 | 7)[];
                    hours: Readonly<{} & {
                        start: string;
                        end: string;
                    }>;
                    timezone: string;
                }> | undefined;
            } & {}> | undefined;
            useAlertDataForTemplate?: boolean | undefined;
        } & {
            group: string;
            id: string;
            actionTypeId: string;
            params: Record<string, any>;
        }>[];
        params: Record<string, any>;
        consumer: string;
        enabled: boolean;
        schedule: Readonly<{} & {
            interval: string;
        }>;
        revision: number;
        rule_type_id: string;
        api_key_owner: string | null;
        api_key_created_by_user: boolean | null | undefined;
        created_by: string | null;
        created_at: string;
        updated_by: string | null;
        updated_at: string;
    };
    initiator: "system" | "user";
    initiator_id: string | undefined;
    schedule: {
        run_at: string;
        status: "complete" | "error" | "pending" | "running" | "timeout";
        interval: string;
    }[];
};

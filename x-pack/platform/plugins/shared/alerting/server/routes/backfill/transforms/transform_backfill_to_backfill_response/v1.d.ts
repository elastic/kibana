import type { Backfill } from '../../../../application/backfill/result/types';
export declare const transformBackfillToBackfillResponse: (backfill: Backfill) => {
    created_at: string;
    space_id: string;
    rule: {
        rule_type_id: string;
        api_key_owner: string | null;
        api_key_created_by_user: boolean | null | undefined;
        created_by: string | null;
        created_at: string;
        updated_by: string | null;
        updated_at: string;
        tags: string[];
        name: string;
        id: string;
        params: Record<string, any>;
        enabled: boolean;
        actions: Readonly<{
            uuid?: string | undefined;
            frequency?: Readonly<{} & {
                summary: boolean;
                throttle: string | null;
                notifyWhen: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval";
            }> | undefined;
            alertsFilter?: Readonly<{
                query?: Readonly<{
                    dsl?: string | undefined;
                } & {
                    filters: Readonly<{
                        query?: Record<string, any> | undefined;
                        $state?: Readonly<{} & {
                            store: import("@kbn/es-query-constants").FilterStateStore;
                        }> | undefined;
                    } & {
                        meta: Record<string, any>;
                    }>[];
                    kql: string;
                }> | undefined;
                timeframe?: Readonly<{} & {
                    days: (2 | 1 | 3 | 7 | 5 | 4 | 6)[];
                    hours: Readonly<{} & {
                        start: string;
                        end: string;
                    }>;
                    timezone: string;
                }> | undefined;
            } & {}> | undefined;
            useAlertDataForTemplate?: boolean | undefined;
        } & {
            id: string;
            params: Record<string, any>;
            group: string;
            actionTypeId: string;
        }>[];
        schedule: Readonly<{} & {
            interval: string;
        }>;
        consumer: string;
        revision: number;
    };
    initiator: "user" | "system";
    initiator_id: string | undefined;
    schedule: {
        run_at: string;
        status: "complete" | "error" | "pending" | "timeout" | "running";
        interval: string;
    }[];
    end?: string | undefined;
    warnings?: string[] | undefined;
    id: string;
    status: "complete" | "error" | "pending" | "timeout" | "running";
    duration: string;
    start: string;
    enabled: boolean;
};

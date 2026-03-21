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
        enabled: boolean;
        id: string;
        name: string;
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
                    timezone: string;
                    days: (2 | 1 | 4 | 6 | 5 | 3 | 7)[];
                    hours: Readonly<{} & {
                        end: string;
                        start: string;
                    }>;
                }> | undefined;
            } & {}> | undefined;
            useAlertDataForTemplate?: boolean | undefined;
        } & {
            id: string;
            group: string;
            params: Record<string, any>;
            actionTypeId: string;
        }>[];
        params: Record<string, any>;
        tags: string[];
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
        status: "error" | "pending" | "timeout" | "complete" | "running";
        interval: string;
    }[];
    end?: string | undefined;
    warnings?: string[] | undefined;
    enabled: boolean;
    id: string;
    status: "error" | "pending" | "timeout" | "complete" | "running";
    start: string;
    duration: string;
};

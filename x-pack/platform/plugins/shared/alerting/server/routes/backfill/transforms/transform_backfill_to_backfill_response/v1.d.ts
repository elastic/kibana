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
        id: string;
        name: string;
        tags: string[];
        params: Record<string, any>;
        enabled: boolean;
        schedule: Readonly<{} & {
            interval: string;
        }>;
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
                    hours: Readonly<{} & {
                        start: string;
                        end: string;
                    }>;
                    days: (2 | 1 | 4 | 5 | 3 | 7 | 6)[];
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
        consumer: string;
        revision: number;
    };
    initiator: "system" | "user";
    initiator_id: string | undefined;
    schedule: {
        run_at: string;
        status: "error" | "complete" | "timeout" | "pending" | "running";
        interval: string;
    }[];
    end?: string | undefined;
    warnings?: string[] | undefined;
    status: "error" | "complete" | "timeout" | "pending" | "running";
    id: string;
    duration: string;
    start: string;
    enabled: boolean;
};

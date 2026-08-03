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
        params: Record<string, any>;
        enabled: boolean;
        name: string;
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
                    days: (1 | 2 | 3 | 5 | 4 | 6 | 7)[];
                    hours: Readonly<{} & {
                        start: string;
                        end: string;
                    }>;
                }> | undefined;
            } & {}> | undefined;
            useAlertDataForTemplate?: boolean | undefined;
        } & {
            id: string;
            params: Record<string, any>;
            group: string;
            actionTypeId: string;
        }>[];
        tags: string[];
        revision: number;
        consumer: string;
        schedule: Readonly<{} & {
            interval: string;
        }>;
    };
    initiator: "system" | "user";
    initiator_id: string | undefined;
    schedule: {
        run_at: string;
        status: "error" | "complete" | "timeout" | "running" | "pending";
        interval: string;
    }[];
    end?: string | undefined;
    warnings?: string[] | undefined;
    id: string;
    enabled: boolean;
    status: "error" | "complete" | "timeout" | "running" | "pending";
    start: string;
    duration: string;
};

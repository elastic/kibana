import type { RulesClientContext } from '../../../../rules_client';
import type { FillGapByIdParams } from './types';
export declare function fillGapById(context: RulesClientContext, params: FillGapByIdParams): Promise<(Readonly<{
    end?: string | undefined;
    warnings?: string[] | undefined;
    initiatorId?: string | undefined;
} & {
    id: string;
    status: "complete" | "error" | "pending" | "timeout" | "running";
    duration: string;
    start: string;
    enabled: boolean;
    rule: Readonly<{
        apiKeyCreatedByUser?: boolean | null | undefined;
    } & {
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
        createdBy: string | null;
        updatedAt: string;
        schedule: Readonly<{} & {
            interval: string;
        }>;
        createdAt: string;
        alertTypeId: string;
        consumer: string;
        updatedBy: string | null;
        revision: number;
        apiKeyOwner: string | null;
    }>;
    spaceId: string;
    schedule: Readonly<{} & {
        status: "complete" | "error" | "pending" | "timeout" | "running";
        interval: string;
        runAt: string;
    }>[];
    createdAt: string;
    initiator: "user" | "system";
}> | Readonly<{} & {
    error: Readonly<{
        status?: number | undefined;
    } & {
        message: string;
        rule: Readonly<{
            name?: string | undefined;
        } & {
            id: string;
        }>;
    }>;
}>)[]>;

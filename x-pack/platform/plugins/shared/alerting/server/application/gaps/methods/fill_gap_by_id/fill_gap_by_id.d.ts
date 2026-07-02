import type { RulesClientContext } from '../../../../rules_client';
import type { FillGapByIdParams } from './types';
export declare function fillGapById(context: RulesClientContext, params: FillGapByIdParams): Promise<(Readonly<{
    end?: string | undefined;
    initiatorId?: string | undefined;
    warnings?: string[] | undefined;
} & {
    id: string;
    status: "error" | "complete" | "running" | "pending" | "timeout";
    duration: string;
    enabled: boolean;
    start: string;
    schedule: Readonly<{} & {
        status: "error" | "complete" | "running" | "pending" | "timeout";
        interval: string;
        runAt: string;
    }>[];
    createdAt: string;
    rule: Readonly<{
        apiKeyCreatedByUser?: boolean | null | undefined;
    } & {
        id: string;
        name: string;
        enabled: boolean;
        actions: Readonly<{
            uuid?: string | undefined;
            frequency?: Readonly<{} & {
                summary: boolean;
                throttle: string | null;
                notifyWhen: "onActiveAlert" | "onThrottleInterval" | "onActionGroupChange";
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
                    days: (2 | 1 | 4 | 5 | 3 | 6 | 7)[];
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
        updatedAt: string;
        params: Record<string, any>;
        tags: string[];
        alertTypeId: string;
        schedule: Readonly<{} & {
            interval: string;
        }>;
        consumer: string;
        createdBy: string | null;
        updatedBy: string | null;
        createdAt: string;
        revision: number;
        apiKeyOwner: string | null;
    }>;
    initiator: "system" | "user";
    spaceId: string;
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

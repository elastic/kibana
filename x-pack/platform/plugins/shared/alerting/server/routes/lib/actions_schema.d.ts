import { FilterStateStore } from '@kbn/es-query';
export declare const actionsSchema: import("@kbn/config-schema").Type<Readonly<{
    uuid?: string | undefined;
    group?: string | undefined;
    frequency?: Readonly<{} & {
        summary: boolean;
        throttle: string | null;
        notify_when: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval";
    }> | undefined;
    alerts_filter?: Readonly<{
        query?: Readonly<{
            dsl?: string | undefined;
        } & {
            filters: Readonly<{
                query?: Record<string, any> | undefined;
                $state?: Readonly<{} & {
                    store: FilterStateStore;
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
    use_alert_data_for_template?: boolean | undefined;
} & {
    id: string;
    params: Record<string, any>;
}>[]>;
export declare const systemActionsSchema: import("@kbn/config-schema").Type<Readonly<{
    uuid?: string | undefined;
} & {
    id: string;
    params: Record<string, any>;
}>[] | undefined>;

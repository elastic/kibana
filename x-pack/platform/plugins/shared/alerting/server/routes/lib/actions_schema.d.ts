import { FilterStateStore } from '@kbn/es-query';
export declare const actionsSchema: import("@kbn/config-schema").Type<Readonly<{
    group?: string | undefined;
    frequency?: Readonly<{} & {
        summary: boolean;
        notify_when: "onActionGroupChange" | "onActiveAlert" | "onThrottleInterval";
        throttle: string | null;
    }> | undefined;
    uuid?: string | undefined;
    alerts_filter?: Readonly<{
        query?: Readonly<{
            dsl?: string | undefined;
        } & {
            kql: string;
            filters: Readonly<{
                query?: Record<string, any> | undefined;
                $state?: Readonly<{} & {
                    store: FilterStateStore;
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

import { FilterStateStore } from '@kbn/es-query';
export declare const alertingV2ScopeSchema: import("@kbn/config-schema").ObjectType<{
    enabled: import("@kbn/config-schema").Type<boolean>;
    kql: import("@kbn/config-schema").Type<string | undefined>;
}>;
export declare const alertsFilterQuerySchema: import("@kbn/config-schema").ObjectType<{
    enabled: import("@kbn/config-schema").Type<boolean | undefined>;
    kql: import("@kbn/config-schema").Type<string | undefined>;
    filters: import("@kbn/config-schema").Type<Readonly<{
        query?: Record<string, any> | undefined;
        $state?: Readonly<{} & {
            store: FilterStateStore;
        }> | undefined;
    } & {
        meta: Record<string, any>;
    }>[] | undefined>;
    dsl: import("@kbn/config-schema").Type<string | undefined>;
}>;

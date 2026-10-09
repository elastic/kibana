import { FilterStateStore } from '@kbn/es-query';
/**
 * Domain/API schema for the deprecated `scopedQuery` field. This is the shipped contract —
 * do NOT change it; changing it here would alter the public API of an existing field.
 */
export declare const alertsFilterQuerySchema: import("@kbn/config-schema").ObjectType<{
    kql: import("@kbn/config-schema").Type<string>;
    filters: import("@kbn/config-schema").Type<Readonly<{
        query?: Record<string, any> | undefined;
        $state?: Readonly<{} & {
            store: FilterStateStore;
        }> | undefined;
    } & {
        meta: Record<string, any>;
    }>[]>;
    dsl: import("@kbn/config-schema").Type<string | undefined>;
}>;
/**
 * Domain schema for the new alerting v1 scope (`scope.alerting`). Carries `enabled` at this
 * layer — the storage layer uses the sibling `alertingEnabled` flag instead to stay compatible
 * with the shipped MV4 `alerting` shape.
 */
export declare const alertingScopeSchema: import("@kbn/config-schema").ObjectType<{
    enabled: import("@kbn/config-schema").Type<boolean>;
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
export declare const alertingV2ScopeSchema: import("@kbn/config-schema").ObjectType<{
    enabled: import("@kbn/config-schema").Type<boolean>;
    kql: import("@kbn/config-schema").Type<string | undefined>;
}>;

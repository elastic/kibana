/**
 * Shared scope schema for request bodies (create / update). Permissive: both alerting and
 * alerting_v2 keys are optional, and query is optional inside each. The response schema
 * maintains the stricter v1 contract (see response/schemas/v1.ts) to preserve backward
 * compatibility of the stable API.
 */
export declare const maintenanceWindowScopeSchemaV1: import("@kbn/config-schema").ObjectType<{
    alerting: import("@kbn/config-schema").Type<Readonly<{
        enabled?: boolean | undefined;
        query?: Readonly<{} & {
            kql: string;
        }> | undefined;
    } & {}> | undefined>;
    alerting_v2: import("@kbn/config-schema").Type<Readonly<{
        enabled?: boolean | undefined;
        query?: Readonly<{} & {
            kql: string;
        }> | undefined;
    } & {}> | undefined>;
}>;

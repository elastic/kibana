import type { TypeOf } from '@kbn/config-schema';
export declare function getBulkCreateOrUpdatePayloadSchema(getBasePrivilegeNames: () => {
    global: string[];
    space: string[];
}): import("@kbn/config-schema").ObjectType<{
    roles: import("@kbn/config-schema").Type<Record<string, Readonly<{
        description?: string | undefined;
        metadata?: Record<string, any> | undefined;
        kibana?: Readonly<{
            base?: string[] | undefined;
            feature?: Record<string, string[]> | undefined;
        } & {
            spaces: string[] | "*"[];
        }>[] | undefined;
    } & {
        elasticsearch: Readonly<{
            cluster?: string[] | undefined;
            indices?: Readonly<{
                field_security?: Record<"grant" | "except", string[]> | undefined;
                query?: string | undefined;
                allow_restricted_indices?: boolean | undefined;
            } & {
                privileges: string[];
                names: string[];
            }>[] | undefined;
            remote_cluster?: Readonly<{
                privileges: string[];
                clusters: string[];
            }>[] | undefined;
            remote_indices?: Readonly<{
                field_security?: Record<"grant" | "except", string[]> | undefined;
                query?: string | undefined;
                allow_restricted_indices?: boolean | undefined;
            } & {
                privileges: string[];
                clusters: string[];
                names: string[];
            }>[] | undefined;
            run_as?: string[] | undefined;
        } & {}>;
    }>>>;
}>;
export type BulkCreateOrUpdateRolesPayloadSchemaType = TypeOf<ReturnType<typeof getBulkCreateOrUpdatePayloadSchema>>;

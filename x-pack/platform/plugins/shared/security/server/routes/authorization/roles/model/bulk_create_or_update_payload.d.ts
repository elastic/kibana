import type { TypeOf } from '@kbn/config-schema';
export declare function getBulkCreateOrUpdatePayloadSchema(getBasePrivilegeNames: () => {
    global: string[];
    space: string[];
}): import("@kbn/config-schema").ObjectType<{
    roles: import("@kbn/config-schema").Type<Record<string, Readonly<{
        kibana?: Readonly<{
            feature?: Record<string, string[]> | undefined;
            base?: string[] | undefined;
        } & {
            spaces: string[] | "*"[];
        }>[] | undefined;
        metadata?: Record<string, any> | undefined;
        description?: string | undefined;
    } & {
        elasticsearch: Readonly<{
            indices?: Readonly<{
                query?: string | undefined;
                field_security?: Record<"grant" | "except", string[]> | undefined;
                allow_restricted_indices?: boolean | undefined;
            } & {
                names: string[];
                privileges: string[];
            }>[] | undefined;
            cluster?: string[] | undefined;
            remote_cluster?: Readonly<{} & {
                privileges: string[];
                clusters: string[];
            }>[] | undefined;
            remote_indices?: Readonly<{
                query?: string | undefined;
                field_security?: Record<"grant" | "except", string[]> | undefined;
                allow_restricted_indices?: boolean | undefined;
            } & {
                names: string[];
                privileges: string[];
                clusters: string[];
            }>[] | undefined;
            run_as?: string[] | undefined;
        } & {}>;
    }>>>;
}>;
export type BulkCreateOrUpdateRolesPayloadSchemaType = TypeOf<ReturnType<typeof getBulkCreateOrUpdatePayloadSchema>>;

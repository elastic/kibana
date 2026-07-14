import { getKibanaRoleSchema } from '../../authorization';
export declare const restApiKeySchema: import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<"rest" | undefined>;
    name: import("@kbn/config-schema").Type<string>;
    expiration: import("@kbn/config-schema").Type<string | undefined>;
    role_descriptors: import("@kbn/config-schema").Type<Record<string, Readonly<{} & {}>>>;
    metadata: import("@kbn/config-schema").Type<Readonly<{} & {}> | undefined>;
}>;
export declare const getRestApiKeyWithKibanaPrivilegesSchema: (getBasePrivilegeNames: Parameters<typeof getKibanaRoleSchema>[0]) => import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<"rest" | undefined>;
    name: import("@kbn/config-schema").Type<string>;
    expiration: import("@kbn/config-schema").Type<string | undefined>;
    metadata: import("@kbn/config-schema").Type<Readonly<{} & {}> | undefined>;
    kibana_role_descriptors: import("@kbn/config-schema").Type<Record<string, Readonly<{} & {
        kibana: Readonly<{
            base?: string[] | undefined;
            feature?: Record<string, string[]> | undefined;
        } & {
            spaces: string[] | "*"[];
        }>[];
        elasticsearch: Readonly<{
            cluster?: string[] | undefined;
            indices?: Readonly<{
                query?: string | undefined;
                allow_restricted_indices?: boolean | undefined;
                field_security?: Record<"grant" | "except", string[]> | undefined;
            } & {
                privileges: string[];
                names: string[];
            }>[] | undefined;
            remote_cluster?: Readonly<{} & {
                privileges: string[];
                clusters: string[];
            }>[] | undefined;
            remote_indices?: Readonly<{
                query?: string | undefined;
                allow_restricted_indices?: boolean | undefined;
                field_security?: Record<"grant" | "except", string[]> | undefined;
            } & {
                privileges: string[];
                names: string[];
                clusters: string[];
            }>[] | undefined;
            run_as?: string[] | undefined;
        } & {}>;
    }>>>;
}>;
export declare const crossClusterApiKeySchema: import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<"cross_cluster">;
    name: import("@kbn/config-schema").Type<string>;
    expiration: import("@kbn/config-schema").Type<string | undefined>;
    metadata: import("@kbn/config-schema").Type<Readonly<{} & {}> | undefined>;
    certificate_identity: import("@kbn/config-schema").Type<string | undefined>;
    access: import("@kbn/config-schema").ObjectType<{
        search: import("@kbn/config-schema").Type<Readonly<{
            query?: any;
            allow_restricted_indices?: boolean | undefined;
            field_security?: any;
        } & {
            names: string[];
        }>[] | undefined>;
        replication: import("@kbn/config-schema").Type<Readonly<{
            allow_restricted_indices?: boolean | undefined;
        } & {
            names: string[];
        }>[] | undefined>;
    }>;
}>;
export declare const updateRestApiKeySchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    type: import("@kbn/config-schema").Type<"rest" | undefined>;
    expiration: import("@kbn/config-schema").Type<string | undefined>;
    role_descriptors: import("@kbn/config-schema").Type<Record<string, Readonly<{} & {}>>>;
    metadata: import("@kbn/config-schema").Type<Readonly<{} & {}> | undefined>;
}>;
export declare const updateCrossClusterApiKeySchema: import("@kbn/config-schema").ObjectType<{
    id: import("@kbn/config-schema").Type<string>;
    type: import("@kbn/config-schema").Type<"cross_cluster">;
    expiration: import("@kbn/config-schema").Type<string | undefined>;
    metadata: import("@kbn/config-schema").Type<Readonly<{} & {}> | undefined>;
    certificate_identity: import("@kbn/config-schema").Type<string | null | undefined>;
    access: import("@kbn/config-schema").ObjectType<{
        search: import("@kbn/config-schema").Type<Readonly<{
            query?: any;
            allow_restricted_indices?: boolean | undefined;
            field_security?: any;
        } & {
            names: string[];
        }>[] | undefined>;
        replication: import("@kbn/config-schema").Type<Readonly<{
            allow_restricted_indices?: boolean | undefined;
        } & {
            names: string[];
        }>[] | undefined>;
    }>;
}>;
export declare const getUpdateRestApiKeyWithKibanaPrivilegesSchema: (getBasePrivilegeNames: Parameters<typeof getKibanaRoleSchema>[0]) => import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<"rest" | undefined>;
    expiration: import("@kbn/config-schema").Type<string | undefined>;
    metadata: import("@kbn/config-schema").Type<Readonly<{} & {}> | undefined>;
    id: import("@kbn/config-schema").Type<string>;
    kibana_role_descriptors: import("@kbn/config-schema").Type<Record<string, Readonly<{} & {
        kibana: Readonly<{
            base?: string[] | undefined;
            feature?: Record<string, string[]> | undefined;
        } & {
            spaces: string[] | "*"[];
        }>[];
        elasticsearch: Readonly<{
            cluster?: string[] | undefined;
            indices?: Readonly<{
                query?: string | undefined;
                allow_restricted_indices?: boolean | undefined;
                field_security?: Record<"grant" | "except", string[]> | undefined;
            } & {
                privileges: string[];
                names: string[];
            }>[] | undefined;
            remote_cluster?: Readonly<{} & {
                privileges: string[];
                clusters: string[];
            }>[] | undefined;
            remote_indices?: Readonly<{
                query?: string | undefined;
                allow_restricted_indices?: boolean | undefined;
                field_security?: Record<"grant" | "except", string[]> | undefined;
            } & {
                privileges: string[];
                names: string[];
                clusters: string[];
            }>[] | undefined;
            run_as?: string[] | undefined;
        } & {}>;
    }>>>;
}>;

import type { TypeOf } from '@kbn/config-schema';
export declare const elasticsearchRoleSchema: import("@kbn/config-schema").ObjectType<{
    /**
     * An optional list of cluster privileges. These privileges define the cluster level actions that
     * users with this role are able to execute
     */
    cluster: import("@kbn/config-schema").Type<string[] | undefined>;
    /**
     * An optional list of remote cluster privileges. These privileges define the remote cluster level actions that
     * users with this role are able to execute
     */
    remote_cluster: import("@kbn/config-schema").Type<Readonly<{} & {
        privileges: string[];
        clusters: string[];
    }>[] | undefined>;
    /**
     * An optional list of indices permissions entries.
     */
    indices: import("@kbn/config-schema").Type<Readonly<{
        field_security?: Record<"except" | "grant", string[]> | undefined;
        query?: string | undefined;
        allow_restricted_indices?: boolean | undefined;
    } & {
        names: string[];
        privileges: string[];
    }>[] | undefined>;
    /**
     * An optional list of remote indices permissions entries.
     */
    remote_indices: import("@kbn/config-schema").Type<Readonly<{
        field_security?: Record<"except" | "grant", string[]> | undefined;
        query?: string | undefined;
        allow_restricted_indices?: boolean | undefined;
    } & {
        clusters: string[];
        names: string[];
        privileges: string[];
    }>[] | undefined>;
    /**
     * An optional list of users that the owners of this role can impersonate.
     */
    run_as: import("@kbn/config-schema").Type<string[] | undefined>;
    /**
     * An optional object defining global privileges. A global privilege is a form of cluster privilege
     * that is request-aware.
     */
    global: import("@kbn/config-schema").Type<Readonly<{
        application?: Readonly<{
            manage?: Readonly<{} & {
                applications: string[];
            }> | undefined;
        } & {}> | undefined;
        profile?: Readonly<{
            write?: Readonly<{} & {
                applications: string[];
            }> | undefined;
        } & {}> | undefined;
        role?: Readonly<{} & {}> | undefined;
        data_source?: Readonly<{} & {
            names: string[];
            privileges: ("create" | "delete" | "manage" | "read" | "read_metadata")[];
        }>[] | undefined;
    } & {}> | undefined>;
}>;
/**
 * Kibana specific portion of the role definition. It's represented as a list of base and/or
 * feature Kibana privileges. None of the entries should apply to the same spaces.
 */
export declare const getKibanaRoleSchema: (getBasePrivilegeNames: () => {
    global: string[];
    space: string[];
}) => import("@kbn/config-schema").Type<Readonly<{
    base?: string[] | undefined;
    feature?: Record<string, string[]> | undefined;
} & {
    spaces: string[] | "*"[];
}>[]>;
export type ElasticsearchPrivilegesType = TypeOf<typeof elasticsearchRoleSchema>;
export type KibanaPrivilegesType = TypeOf<ReturnType<typeof getKibanaRoleSchema>>;

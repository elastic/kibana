import type { TypeOf } from '@kbn/config-schema';
/**
 * Elasticsearch specific portion of the role definition.
 * See more details at https://www.elastic.co/guide/en/elasticsearch/reference/master/security-api.html#security-role-apis.
 */
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
        query?: string | undefined;
        field_security?: Record<"grant" | "except", string[]> | undefined;
        allow_restricted_indices?: boolean | undefined;
    } & {
        names: string[];
        privileges: string[];
    }>[] | undefined>;
    /**
     * An optional list of remote indices permissions entries.
     */
    remote_indices: import("@kbn/config-schema").Type<Readonly<{
        query?: string | undefined;
        field_security?: Record<"grant" | "except", string[]> | undefined;
        allow_restricted_indices?: boolean | undefined;
    } & {
        names: string[];
        privileges: string[];
        clusters: string[];
    }>[] | undefined>;
    /**
     * An optional list of users that the owners of this role can impersonate.
     */
    run_as: import("@kbn/config-schema").Type<string[] | undefined>;
}>;
/**
 * Kibana specific portion of the role definition. It's represented as a list of base and/or
 * feature Kibana privileges. None of the entries should apply to the same spaces.
 */
export declare const getKibanaRoleSchema: (getBasePrivilegeNames: () => {
    global: string[];
    space: string[];
}) => import("@kbn/config-schema").Type<Readonly<{
    feature?: Record<string, string[]> | undefined;
    base?: string[] | undefined;
} & {
    spaces: string[] | "*"[];
}>[]>;
export type ElasticsearchPrivilegesType = TypeOf<typeof elasticsearchRoleSchema>;
export type KibanaPrivilegesType = TypeOf<ReturnType<typeof getKibanaRoleSchema>>;

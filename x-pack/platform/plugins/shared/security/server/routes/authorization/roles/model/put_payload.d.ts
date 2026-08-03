import type { TypeOf } from '@kbn/config-schema';
import type { ElasticsearchRole } from '../../../../authorization';
export declare const transformPutPayloadToElasticsearchRole: (rolePayload: RolePayloadSchemaType, application: string, allExistingApplications?: ElasticsearchRole["applications"]) => Omit<ElasticsearchRole, "name">;
export declare function getPutPayloadSchema(getBasePrivilegeNames: () => {
    global: string[];
    space: string[];
}): import("@kbn/config-schema").ObjectType<{
    /**
     * Optional text to describe the Role
     */
    description: import("@kbn/config-schema").Type<string | undefined>;
    /**
     * An optional meta-data dictionary. Within the metadata, keys that begin with _ are reserved
     * for system usage.
     */
    metadata: import("@kbn/config-schema").Type<Record<string, any> | undefined>;
    /**
     * Elasticsearch specific portion of the role definition.
     */
    elasticsearch: import("@kbn/config-schema").ObjectType<{
        cluster: import("@kbn/config-schema").Type<string[] | undefined>;
        remote_cluster: import("@kbn/config-schema").Type<Readonly<{} & {
            privileges: string[];
            clusters: string[];
        }>[] | undefined>;
        indices: import("@kbn/config-schema").Type<Readonly<{
            field_security?: Record<"grant" | "except", string[]> | undefined;
            query?: string | undefined;
            allow_restricted_indices?: boolean | undefined;
        } & {
            privileges: string[];
            names: string[];
        }>[] | undefined>;
        remote_indices: import("@kbn/config-schema").Type<Readonly<{
            field_security?: Record<"grant" | "except", string[]> | undefined;
            query?: string | undefined;
            allow_restricted_indices?: boolean | undefined;
        } & {
            privileges: string[];
            clusters: string[];
            names: string[];
        }>[] | undefined>;
        run_as: import("@kbn/config-schema").Type<string[] | undefined>;
    }>;
    /**
     * Kibana specific portion of the role definition.
     */
    kibana: import("@kbn/config-schema").Type<Readonly<{
        base?: string[] | undefined;
        feature?: Record<string, string[]> | undefined;
    } & {
        spaces: string[] | "*"[];
    }>[] | undefined>;
}>;
export type RolePayloadSchemaType = TypeOf<ReturnType<typeof getPutPayloadSchema>>;

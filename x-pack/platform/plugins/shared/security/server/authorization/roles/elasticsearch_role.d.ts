import type { Logger } from '@kbn/core/server';
import type { KibanaFeature } from '@kbn/features-plugin/common';
import type { SubFeaturePrivilegeIterator } from '@kbn/features-plugin/server';
import type { RoleKibanaApplication } from '@kbn/security-plugin-types-common';
import type { Role } from '../../../common';
export type ElasticsearchRole = Pick<Role, 'name' | 'description' | 'metadata' | 'transient_metadata'> & {
    applications: RoleKibanaApplication[];
    cluster: Role['elasticsearch']['cluster'];
    remote_cluster: Role['elasticsearch']['remote_cluster'];
    indices: Role['elasticsearch']['indices'];
    remote_indices?: Role['elasticsearch']['remote_indices'];
    run_as: Role['elasticsearch']['run_as'];
};
export interface TransformRoleOptions {
    features: KibanaFeature[];
    elasticsearchRole: Omit<ElasticsearchRole, 'name'>;
    name: string;
    application: string;
    logger: Logger;
    subFeaturePrivilegeIterator: SubFeaturePrivilegeIterator;
    replaceDeprecatedKibanaPrivileges?: boolean;
}
export declare function transformElasticsearchRoleToRole({ features, elasticsearchRole, name, application, logger, subFeaturePrivilegeIterator, replaceDeprecatedKibanaPrivileges, }: TransformRoleOptions): Role;
export declare const compareRolesByName: (roleA: Role, roleB: Role) => 1 | 0 | -1;

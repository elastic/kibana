import type { KibanaFeature } from '@kbn/features-plugin/server';
import type { KibanaPrivilegesType } from '@kbn/security-plugin-types-server';
export declare const transformPrivilegesToElasticsearchPrivileges: (application: string, kibanaPrivileges?: KibanaPrivilegesType) => {
    privileges: string[];
    application: string;
    resources: string[];
}[];
export declare const validateKibanaPrivileges: (kibanaFeatures: KibanaFeature[], kibanaPrivileges?: KibanaPrivilegesType) => {
    validationErrors: string[];
};

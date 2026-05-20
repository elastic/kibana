import type { PackagePolicy } from '../../../types';
/**
 * Get the project id, organization id and account type of gcp integration from a package policy
 */
export declare const getGcpIntegrationDetailsFromPackagePolicy: (packagePolicy?: PackagePolicy) => {
    gcpProjectId: string | undefined;
    gcpOrganizationId: string | undefined;
    gcpAccountType: string | undefined;
};

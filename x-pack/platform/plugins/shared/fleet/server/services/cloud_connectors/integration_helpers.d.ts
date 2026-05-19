import type { CloudProvider, CloudConnectorVars, AccountType, PackageInfo } from '../../../common/types';
import type { NewPackagePolicy } from '../../types';
/**
 * Extracts the account type from package policy
 *
 * Checks provider-specific account type vars (legacy approach for CSPM).
 * Returns DEFAULT_ACCOUNT_TYPE ('single-account') if not found.
 *
 * @param cloudProvider - The cloud provider (aws, azure, gcp)
 * @param packagePolicy - The package policy containing account type vars
 * @param packageInfo - The package info for storage mode detection
 * @returns Account type ('single-account' or 'organization-account')
 */
export declare function extractAccountType(cloudProvider: CloudProvider, packagePolicy: NewPackagePolicy, packageInfo: PackageInfo): AccountType;
/**
 * Validates that the account type value is one of the standardized values
 *
 * All cloud providers use the same standardized values: 'single-account' or 'organization-account'
 *
 * @param accountType - The account type value from package policy
 * @returns Valid account type or undefined if not recognized
 */
export declare function validateAccountType(accountType: string | undefined): AccountType | undefined;
/**
 * Updates package policy with cloud connector secret references at the correct location
 * This ensures that extractAndWriteSecrets recognizes these as existing secrets
 * and doesn't attempt to create duplicate secrets.
 *
 * @param packagePolicy - The package policy to update
 * @param cloudConnectorVars - Cloud connector variables with secret references
 * @param cloudProvider - The cloud provider (aws, azure, gcp)
 * @param packageInfo - The package info for storage mode detection
 * @returns Updated package policy with secret references in place
 */
export declare function updatePackagePolicyWithCloudConnectorSecrets(packagePolicy: NewPackagePolicy, cloudConnectorVars: CloudConnectorVars, cloudProvider: CloudProvider, packageInfo: PackageInfo): NewPackagePolicy;
/**
 * Extracts cloud connector name from package policy variables
 * Used to name cloud connectors based on user input or generate a default name
 *
 * @param packagePolicy - The package policy containing the cloud connector variables
 * @param targetCsp - The target cloud service provider
 * @param policyName - The agentless policy name to use for generating default name
 * @param packageInfo - The package info for storage mode detection
 * @returns The cloud connector name
 */
export declare function getCloudConnectorNameFromPackagePolicy(packagePolicy: NewPackagePolicy, targetCsp: CloudProvider, policyName: string, packageInfo: PackageInfo): string;

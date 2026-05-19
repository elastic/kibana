import type { PackageInfo } from '../../types/models/epm';
import type { NewPackagePolicy, PackagePolicy, PackagePolicyConfigRecord, PackagePolicyConfigRecordEntry } from '../../types/models/package_policy';
import type { CloudProvider } from '../../types/models/cloud_connector';
import type { CloudConnectorVarStorageMode, CloudConnectorVarTarget, ResolvedVarTarget, NormalizedCloudConnectorCredentials } from './types';
/**
 * Determines the storage scope for cloud connector credential variables based on PackageInfo.
 *
 * Cloud connector credentials can be stored at two different scopes:
 * - Package scope: Variables stored at policy.vars (global to the package)
 * - Input/stream scope: Variables stored at policy.inputs[].streams[].vars
 *
 * Package scope is used when PackageInfo.vars contains cloud connector credential var definitions.
 * Input/stream scope is the default when credentials are defined at the stream level.
 *
 * @param packageInfo - The package info containing var definitions
 * @returns The storage scope ('package' or 'input')
 */
export declare function getCredentialStorageScope(packageInfo: PackageInfo): CloudConnectorVarStorageMode;
/**
 * Resolves the target location for cloud connector variables in a package policy
 *
 * For package mode: returns reference to policy.vars
 * For input mode: validates single enabled input/stream and returns reference to stream.vars
 *
 * @param packagePolicy - The package policy to resolve target for
 * @param mode - The storage mode to use
 * @returns The resolved var target with the vars container
 */
export declare function resolveVarTarget(packagePolicy: NewPackagePolicy | PackagePolicy, mode: CloudConnectorVarStorageMode): ResolvedVarTarget;
/**
 * Applies updated vars at the correct location based on the resolved target.
 *
 * This is the write-side complement to resolveVarTarget (which handles reading).
 * - Package scope: Updates policy.vars (global to the package)
 * - Input/stream scope: Updates policy.inputs[].streams[].vars
 *
 * @param policy - The package policy to update
 * @param updatedVars - The updated vars to apply
 * @param target - The resolved target indicating where to apply vars
 * @returns A new policy with updated vars at the correct location
 */
export declare function applyVarsAtTarget<T extends NewPackagePolicy | PackagePolicy>(policy: T, updatedVars: PackagePolicyConfigRecord, target: CloudConnectorVarTarget): T;
/**
 * Finds the first existing var entry by checking primary key and all aliases
 *
 * @param vars - The vars container to search
 * @param varKeys - Array of var key names to check (primary and aliases)
 * @returns The found var entry or undefined
 */
export declare function findFirstVarEntry(vars: PackagePolicyConfigRecord | undefined, varKeys: string[]): PackagePolicyConfigRecordEntry | undefined;
/**
 * Extracts raw credential variables from the correct location in a package policy
 *
 * This function determines the storage mode from PackageInfo and extracts
 * the raw vars container from the appropriate location.
 *
 * @param packagePolicy - The package policy to extract from
 * @param packageInfo - The package info for mode detection
 * @returns The raw vars container or undefined if not found
 */
export declare function extractRawCredentialVars(packagePolicy: NewPackagePolicy | PackagePolicy, packageInfo: PackageInfo): PackagePolicyConfigRecord | undefined;
/**
 * Reads normalized credentials from a package policy for a given provider
 *
 * @param packagePolicy - The package policy to read from
 * @param provider - The cloud provider
 * @param packageInfo - The package info for mode detection
 * @returns Normalized credentials for the provider
 */
export declare function readCredentials(packagePolicy: NewPackagePolicy | PackagePolicy, provider: CloudProvider, packageInfo: PackageInfo): NormalizedCloudConnectorCredentials;
/**
 * Writes credentials to the correct location in a package policy
 *
 * Returns a new package policy with the updated credentials.
 * Does not mutate the original policy.
 *
 * @param packagePolicy - The package policy to update
 * @param credentials - The credentials to write
 * @param provider - The cloud provider
 * @param packageInfo - The package info for mode detection
 * @returns Updated package policy with credentials written
 */
export declare function writeCredentials<T extends NewPackagePolicy | PackagePolicy>(packagePolicy: T, credentials: Partial<NormalizedCloudConnectorCredentials>, provider: CloudProvider, packageInfo: PackageInfo): T;
/**
 * Gets the var target for a specific provider and package
 * Utility function for cases where you need the target info without reading credentials
 *
 * @param packagePolicy - The package policy
 * @param packageInfo - The package info
 * @returns The resolved var target
 */
export declare function getVarTarget(packagePolicy: NewPackagePolicy | PackagePolicy, packageInfo: PackageInfo): CloudConnectorVarTarget;

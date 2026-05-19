import type { PackageInfo, RegistryVarsEntry, RegistryStream, PackagePolicyConfigRecord, NewPackagePolicyInput, NewPackagePolicy, RegistryStreamWithDataStream } from '../types';
type PackagePolicyStream = RegistryStream & {
    data_stream: {
        type?: string;
        dataset: string;
    };
};
/**
 * Returns the effective discriminator for an input, regardless of whether it comes from
 * the registry (`RegistryInput`) or a stored package policy (`NewPackagePolicyInput`).
 *
 * Uses the explicit `name` field when present, falling back to `type`. This value is
 * used as the keying and matching discriminator throughout Fleet so that multiple inputs
 * of the same `type` within one policy template can be distinguished.
 */
export declare const getInputEffectiveName: (input: {
    name?: string;
    type: string;
}) => string;
/**
 * Builds the composite key used to index input validation results and var definitions.
 * For packages with integrations (multiple policy templates), the key is prefixed with
 * the policy template name to avoid collisions across templates.
 */
export declare const buildInputKey: (effectiveName: string, policyTemplateName: string | undefined, hasIntegrations: boolean) => string;
export declare const getStreamsForInputType: (inputType: string, packageInfo: PackageInfo, dataStreamPaths?: string[]) => PackagePolicyStream[];
export declare const getRegistryStreamWithDataStreamForInputType: (inputType: string, packageInfo: PackageInfo, dataStreamPaths?: string[]) => RegistryStreamWithDataStream[];
export declare const varsReducer: (configObject: PackagePolicyConfigRecord, registryVar: RegistryVarsEntry) => PackagePolicyConfigRecord;
export declare const packageToPackagePolicyInputs: (packageInfo: PackageInfo, integrationToEnable?: string) => NewPackagePolicyInput[];
/**
 * Builds a `NewPackagePolicy` structure based on a package
 *
 * @param packageInfo
 * @param agentPolicyId
 * @param outputId
 * @param packagePolicyName
 */
export declare const packageToPackagePolicy: (packageInfo: PackageInfo, agentPolicyIds: string | string[], namespace?: string, packagePolicyName?: string, description?: string, integrationToEnable?: string) => NewPackagePolicy;
export {};

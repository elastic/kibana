import type { RegistryPolicyTemplate, RegistryPolicyInputOnlyTemplate, RegistryPolicyIntegrationTemplate, RegistryInput, PackageInfo, RegistryVarsEntry, RegistryDataStream, InputOnlyRegistryDataStream, InstallablePackage, NewPackagePolicy, NewPackagePolicyInput, PackagePolicyInput } from '../types';
export declare const DATA_STREAM_USE_APM_VAR: RegistryVarsEntry;
export declare function packageHasNoPolicyTemplates(packageInfo: PackageInfo): boolean;
export declare function isInputOnlyPolicyTemplate(policyTemplate: RegistryPolicyTemplate): policyTemplate is RegistryPolicyInputOnlyTemplate;
export declare function isIntegrationPolicyTemplate(policyTemplate: RegistryPolicyTemplate): policyTemplate is RegistryPolicyIntegrationTemplate;
export declare const getNormalizedInputs: (policyTemplate: RegistryPolicyTemplate) => RegistryInput[];
/**
 * Returns the `RegistryInput` definition for a given policy template and input type.
 * - Input-only templates: the single synthesized RegistryInput (from template fields).
 * - Integration templates: the matching entry from `inputs[]`.
 */
export declare function getPolicyTemplateInputDefinition(policyTemplate: RegistryPolicyTemplate, inputType?: string): RegistryInput | undefined;
/**
 * Returns true when the given RegistryInput declares dynamic signal types.
 * The package-spec governs which inputs may set this flag; Fleet trusts the
 * boolean without gating on the input type so future non-OTel inputs can use
 * the same mechanism without requiring a Fleet change.
 */
export declare function registryInputAllowsDynamicSignalTypes(input: RegistryInput): boolean;
/**
 * Returns true when any policy template in the package contains an input that
 * declares dynamic signal types (dynamic_signal_types: true).
 *
 * Optionally, you can scope the query to a specific policy template and/or input type.
 *
 * Covers both:
 *   - Input-only packages (top-level `input` key on the policy template)
 *   - Composable integration packages (nested `inputs[]` entries)
 */
export declare const hasDynamicSignalTypes: (packageInfo: PackageInfo | undefined, scope?: {
    policyTemplateName?: string;
    inputType?: string;
}) => boolean;
/**
 * Returns true when the given package policy input corresponds to a registry input
 * that allows undefined data_stream.type (i.e. dynamic_signal_types).
 *
 * Works for both:
 *   - Input-only packages (policy template with top-level `input` key)
 *   - Composable integration packages (policy template with `inputs[]`)
 */
export declare function packagePolicyInputAllowsUndefinedDataStreamType(packageInfo: PackageInfo, packagePolicyInput: Pick<NewPackagePolicyInput | PackagePolicyInput, 'type' | 'policy_template'>): boolean;
export declare function getNormalizedDataStreams(packageInfo: {
    type: 'input';
} & (PackageInfo | InstallablePackage), datasetName?: string, dataStreamType?: string): InputOnlyRegistryDataStream[];
export declare function getNormalizedDataStreams(packageInfo: PackageInfo | InstallablePackage, datasetName?: string, dataStreamType?: string): RegistryDataStream[];
export declare const shouldIncludeUseAPMVar: (inputType: string, dataStreamType: string | undefined, isDynamicSignalTypes: boolean) => boolean;
export declare const addUseAPMVarIfNotPresent: (vars?: RegistryVarsEntry[]) => RegistryVarsEntry[];
export declare const hasMultipleEnabledPolicyTemplates: (packagePolicy: NewPackagePolicy) => boolean;
export declare function filterPolicyTemplatesTiles<T>(templatesBehavior: string | undefined, packagePolicy: T, packagePolicyTemplates: T[]): T[];

import { type CloudProvider } from '../../types';
import type { AccountType } from '../../types/models/cloud_connector';
import type { NewPackagePolicy, NewPackagePolicyInput } from '../../types';
import type { RegistryVarGroup } from '../../types/models/package_spec';
import { type VarGroupSelection } from '../var_group_helpers';
export { getSelectedOption, type VarGroupSelection } from '../var_group_helpers';
/**
 * Result of checking if a cloud connector option is selected
 */
export interface CloudConnectorOptionResult {
    /** Whether a cloud connector option is currently selected */
    isSelected: boolean;
    /** The cloud provider (e.g., 'aws', 'azure') if cloud connector is selected */
    provider?: CloudProvider;
}
/**
 * Checks if any selected var_group option has a `provider` field, indicating Cloud Connector support.
 * Returns the provider value if found.
 *
 * @param varGroups - The var_groups from package info
 * @param varGroupSelections - Current var_group selections
 * @returns Object indicating if cloud connector is selected and the provider
 */
export declare const getCloudConnectorOption: (varGroups: RegistryVarGroup[] | undefined, varGroupSelections: VarGroupSelection) => CloudConnectorOptionResult;
/**
 * Gets the variable names that belong to the selected cloud connector option.
 * These vars are handled by the CloudConnectorSetup component and should be hidden
 * from the regular var fields UI to prevent duplicate inputs.
 *
 * @param varGroups - The var_groups from package info
 * @param varGroupSelections - Current var_group selections
 * @returns Set of variable names handled by cloud connector
 */
export declare const getCloudConnectorVars: (varGroups: RegistryVarGroup[] | undefined, varGroupSelections: VarGroupSelection) => Set<string>;
/**
 * Gets the iac_template_url from the currently selected var_group option.
 * This is used for Fleet integrations that store IaC template URLs (CloudFormation, ARM)
 * as properties on the var_group option rather than in input.vars.
 *
 * @param varGroups - The var_groups from package info
 * @param varGroupSelections - Current var_group selections
 * @returns The IaC template URL or undefined
 */
export declare const getIacTemplateUrlFromVarGroupSelection: (varGroups: RegistryVarGroup[] | undefined, varGroupSelections: VarGroupSelection) => string | undefined;
/**
 * Resolves the account type from var_group scope or package policy inputs.
 *
 * When var_groups are defined, the account type var must be within the selected option's
 * vars scope to be read. When var_groups are undefined (legacy integrations), reads
 * directly from package policy inputs as a fallback. Always defaults to 'single-account'.
 *
 * @param provider - The cloud provider (aws, azure, gcp)
 * @param varGroups - The var_groups from package info
 * @param cloudConnectorVars - Set of var names scoped to the selected var_group option
 * @param inputs - The package policy inputs
 * @returns The resolved account type, always defaults to 'single-account'
 */
export declare const getAccountTypeFromVarGroupOrInputs: (provider: CloudProvider | undefined, varGroups: RegistryVarGroup[] | undefined, cloudConnectorVars: Set<string>, inputs: NewPackagePolicyInput[] | undefined) => AccountType;
/**
 * Returns all variable names that belong to any cloud connector option across all var_groups.
 * Unlike getCloudConnectorVars (which only returns vars for the currently selected option),
 * this returns vars from ALL options with a `provider` field, regardless of selection state.
 *
 * Used to identify vars that need to be cleared when switching away from cloud connector.
 */
export declare const getAllCloudConnectorVarNames: (varGroups: RegistryVarGroup[] | undefined) => Set<string>;
/**
 * Detects the target cloud provider from either:
 * 1. var_group selections (new approach - provider field in selected option)
 * 2. Input type matching (legacy approach - input.type contains aws|azure|gcp)
 *
 * @param packagePolicy - The package policy to check
 * @param varGroups - The var_groups from package info
 * @returns The detected cloud provider or undefined
 */
export declare const detectTargetCsp: (packagePolicy: NewPackagePolicy, varGroups: RegistryVarGroup[] | undefined) => CloudProvider | undefined;

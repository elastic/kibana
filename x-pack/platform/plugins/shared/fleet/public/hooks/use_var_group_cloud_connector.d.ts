import type { NewPackagePolicy, RegistryVarGroup } from '../../common';
import { type VarGroupSelection } from '../../common/services/cloud_connectors';
import type { AccountType, CloudProvider } from '../types';
import type { UpdatePolicy } from '../components/cloud_connector/types';
export type { VarGroupSelection };
export interface CloudConnectorInfo {
    /** Whether a cloud connector option is currently selected */
    isSelected: boolean;
    /** The cloud provider (e.g., 'aws', 'azure') if cloud connector is selected */
    cloudProvider?: CloudProvider;
    /** The account type (e.g., 'single-account', 'organization-account') derived from input vars or var_group scope */
    accountType: AccountType;
    /** IaC template URL from the selected var_group option */
    iacTemplateUrl?: string;
    /** Set of variable names handled by cloud connector (should be hidden from regular var fields) */
    cloudConnectorVars: Set<string>;
    /** Callback compatible with CloudConnectorSetup component */
    handleCloudConnectorUpdate: UpdatePolicy;
}
export interface UseVarGroupCloudConnectorProps {
    /** The var_groups from package info */
    varGroups: RegistryVarGroup[] | undefined;
    /** Current var_group selections */
    varGroupSelections: VarGroupSelection;
    /** The current package policy (used to derive account type from input vars) */
    packagePolicy: NewPackagePolicy;
    /** Callback to update the package policy */
    updatePackagePolicy: (fields: Partial<NewPackagePolicy>) => void;
}
/**
 * Hook to manage cloud connector state derived from var_group selections.
 *
 * When a var_group option with a `provider` field is selected, this indicates
 * that the CloudConnectorSetup component should be shown instead of individual
 * var input fields.
 *
 * This hook provides:
 * - Whether a cloud connector option is selected
 * - The cloud provider type (aws, azure, etc.)
 * - The IaC template URL if available
 * - The set of vars handled by cloud connector (to hide from regular form)
 * - A callback compatible with CloudConnectorSetup
 */
export declare const useVarGroupCloudConnector: ({ varGroups, varGroupSelections, packagePolicy, updatePackagePolicy, }: UseVarGroupCloudConnectorProps) => CloudConnectorInfo;

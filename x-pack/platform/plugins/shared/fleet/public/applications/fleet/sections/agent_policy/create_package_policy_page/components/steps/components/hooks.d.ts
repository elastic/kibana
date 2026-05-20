import type { NewPackagePolicy, PackagePolicy } from '../../../../../../../../../common/types';
import type { RegistryVarGroup } from '../../../../../../types';
import { type VarGroupSelection } from '../../../services/var_group_helpers';
export declare function useDataStreamId(): string | undefined;
export declare function useOutputs(packagePolicy: Pick<PackagePolicy, 'supports_agentless'>, packageName: string): {
    isLoading: boolean;
    canUseOutputPerIntegration: boolean | undefined;
    allowedOutputs: import("../../../../../../types").Output[];
};
/**
 * Update type for var group selection changes.
 * Includes var_group_selections plus any additional policy effects.
 */
interface VarGroupSelectionsUpdate {
    var_group_selections: VarGroupSelection;
    [key: string]: unknown;
}
interface UseVarGroupSelectionsParams {
    varGroups: RegistryVarGroup[] | undefined;
    savedSelections: VarGroupSelection | undefined;
    isAgentlessEnabled: boolean;
    /**
     * Callback for selection changes. Receives var_group_selections and any
     * computed policy effects (when packagePolicy is provided).
     */
    onSelectionsChange: (update: VarGroupSelectionsUpdate) => void;
    /**
     * Optional: current package policy for computing policy effects.
     * When provided along with varGroups, selection changes will compute
     * and include policy effects (e.g., supports_cloud_connector) in the update.
     * If not provided, only var_group_selections will be included in updates.
     */
    packagePolicy?: NewPackagePolicy;
}
/**
 * Hook for managing var group selections state.
 * Handles deriving current selections, initializing defaults, selection changes,
 * and computing policy effects based on selected options.
 */
export declare function useVarGroupSelections({ varGroups, savedSelections, isAgentlessEnabled, onSelectionsChange, packagePolicy, }: UseVarGroupSelectionsParams): {
    selections: VarGroupSelection;
    handleSelectionChange: (groupName: string, optionName: string) => void;
};
export {};

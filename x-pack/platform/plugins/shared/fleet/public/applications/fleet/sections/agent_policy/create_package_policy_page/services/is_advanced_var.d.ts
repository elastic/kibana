import type { RegistryVarsEntry, RegistryVarGroup } from '../../../../types';
import { type VarGroupSelection } from './var_group_helpers';
/**
 * Determines if a variable should be shown under "Advanced options".
 *
 * A var is NOT advanced (shown by default) if:
 * - show_user is true, OR
 * - required is true AND default is undefined, OR
 * - the var is part of a currently selected var_group option (overrides show_user: false)
 *
 * @param varDef - The variable definition
 * @param varGroups - Optional var_groups from the package/stream
 * @param varGroupSelections - Optional current var_group selections
 */
export declare const isAdvancedVar: (varDef: RegistryVarsEntry, varGroups?: RegistryVarGroup[], varGroupSelections?: VarGroupSelection) => boolean;

import type { PackagePolicyConfigRecord, RegistryVarsEntry, RegistryVarGroup } from '../../../../types';
import { type VarGroupSelection } from './var_group_helpers';
export type YamlParseFn = (value: string) => unknown;
export declare const hasInvalidButRequiredVar: (parse: YamlParseFn, registryVars?: RegistryVarsEntry[], packagePolicyVars?: PackagePolicyConfigRecord, varGroups?: RegistryVarGroup[], varGroupSelections?: VarGroupSelection) => boolean;

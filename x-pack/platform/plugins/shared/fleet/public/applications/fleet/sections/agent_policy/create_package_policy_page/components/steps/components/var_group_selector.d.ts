import React from 'react';
import type { RegistryVarGroup } from '../../../../../../types';
interface VarGroupSelectorProps {
    varGroup: RegistryVarGroup;
    selectedOptionName: string | undefined;
    onSelectionChange: (groupName: string, optionName: string) => void;
    isAgentlessEnabled: boolean;
    hideInVarGroupOptions?: Record<string, string[]>;
    disabled?: boolean;
}
/**
 * VarGroupSelector component renders a dropdown for selecting between
 * mutually exclusive variable groups (e.g., authentication methods).
 */
export declare const VarGroupSelector: React.FC<VarGroupSelectorProps>;
export {};

import React from 'react';
import type { AgentAccessControlEntry, AgentAccessControlRole, AgentAccessControlMode } from '@kbn/agent-builder-common';
interface PrincipalRowProps {
    entry: AgentAccessControlEntry;
    /** Used to constrain the selectable roles for Public/Shared agents. */
    accessControlMode?: AgentAccessControlMode;
    isDisabled?: boolean;
    onChangeRole: (next: AgentAccessControlRole) => void;
    onRemove: () => void;
}
/**
 * One row in the People section. Layout:
 *
 *   [icon]  [name]                                    [role select ▾]  [✕]
 */
export declare const PrincipalRow: React.FC<PrincipalRowProps>;
export {};

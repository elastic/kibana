import type { PublicSkillSummary } from '@kbn/agent-builder-common';
import React from 'react';
interface SkillContextMenuProps {
    skill: PublicSkillSummary;
    onDelete: (skillId: string) => void;
    canManage: boolean;
}
export declare const SkillContextMenu: React.FC<SkillContextMenuProps>;
export {};

import React from 'react';
import type { PublicSkillSummary } from '@kbn/agent-builder-common';
export interface ActiveSkillRowProps {
    skill: PublicSkillSummary;
    isSelected: boolean;
    onSelect: (skill: PublicSkillSummary) => void;
    onRemove: (skill: PublicSkillSummary) => void;
    isRemoving?: boolean;
    isAutoIncluded: boolean;
    canEditAgent: boolean;
}
export declare const ActiveSkillRow: React.FC<ActiveSkillRowProps>;

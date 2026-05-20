import React from 'react';
import type { PublicSkillSummary } from '@kbn/agent-builder-common';
interface SkillLibraryPanelProps {
    onClose: () => void;
    allSkills: PublicSkillSummary[];
    activeSkillIdSet: Set<string>;
    onToggleSkill: (skill: PublicSkillSummary, isActive: boolean) => void;
    enableElasticCapabilities?: boolean;
    builtinSkillIdSet?: Set<string>;
}
export declare const SkillLibraryPanel: React.FC<SkillLibraryPanelProps>;
export {};

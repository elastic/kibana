import React from 'react';
interface SkillDetailPanelProps {
    skillId: string;
    onEdit: () => void;
    onRemove: () => void;
    isAutoIncluded: boolean;
    canEditAgent: boolean;
}
export declare const SkillDetailPanel: React.FC<SkillDetailPanelProps>;
export {};

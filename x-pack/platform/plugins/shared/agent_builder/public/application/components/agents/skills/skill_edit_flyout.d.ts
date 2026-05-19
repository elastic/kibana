import React from 'react';
interface SkillEditFlyoutProps {
    skillId: string;
    onClose: () => void;
    onSaved?: () => void;
}
export declare const SkillEditFlyout: React.FC<SkillEditFlyoutProps>;
export {};

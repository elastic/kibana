import React from 'react';
import type { PublicSkillDefinition } from '@kbn/agent-builder-common';
interface SkillCreateFlyoutProps {
    onClose: () => void;
    onSkillCreated?: (skill: PublicSkillDefinition) => void;
}
export declare const SkillCreateFlyout: React.FC<SkillCreateFlyoutProps>;
export {};

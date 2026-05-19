import React from 'react';
import type { ReferencedContentItem } from './skill_form_validation';
export interface SkillReferencedContentReadOnlyProps {
    skillName: string;
    items: ReferencedContentItem[];
}
export declare const SkillReferencedContentReadOnly: React.FC<SkillReferencedContentReadOnlyProps>;

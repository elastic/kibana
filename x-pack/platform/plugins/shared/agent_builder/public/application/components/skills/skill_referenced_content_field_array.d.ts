import React from 'react';
import { type Control } from 'react-hook-form';
import type { SkillFormData } from './skill_form_validation';
export interface SkillReferencedContentFieldArrayProps {
    control: Control<SkillFormData>;
    readOnly?: boolean;
}
export declare const SkillReferencedContentFieldArray: React.FC<SkillReferencedContentFieldArrayProps>;

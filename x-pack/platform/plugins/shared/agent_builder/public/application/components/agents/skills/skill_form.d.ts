import React from 'react';
import type { Control } from 'react-hook-form';
import type { SkillFormData } from '../../skills/skill_form_validation';
interface SkillFormProps {
    control: Control<SkillFormData>;
    toolOptions: Array<{
        label: string;
        value: string;
    }>;
    /**
     * When provided, the ID field is rendered as a disabled static input.
     * When omitted, the ID field is rendered as an editable Controller-driven input.
     */
    readonlySkillId?: string;
}
export declare const SkillForm: React.FC<SkillFormProps>;
export {};

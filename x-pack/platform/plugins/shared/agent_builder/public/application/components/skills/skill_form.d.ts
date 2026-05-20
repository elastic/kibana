import type { PublicSkillDefinition } from '@kbn/agent-builder-common';
import React from 'react';
import type { CreateSkillPayload, UpdateSkillPayload } from '../../../../common/http_api/skills';
export declare enum SkillFormMode {
    Create = "create",
    Edit = "edit",
    View = "view"
}
interface SkillFormBaseProps {
    skill?: PublicSkillDefinition;
    isLoading: boolean;
}
interface SkillFormCreateProps extends SkillFormBaseProps {
    mode: SkillFormMode.Create;
    isSubmitting: boolean;
    onSave: (data: CreateSkillPayload) => Promise<unknown>;
}
interface SkillFormEditProps extends SkillFormBaseProps {
    mode: SkillFormMode.Edit;
    isSubmitting: boolean;
    onSave: (data: UpdateSkillPayload) => Promise<unknown>;
}
interface SkillFormViewProps extends SkillFormBaseProps {
    mode: SkillFormMode.View;
    isSubmitting?: never;
    onSave?: never;
}
export type SkillFormProps = SkillFormCreateProps | SkillFormEditProps | SkillFormViewProps;
export declare const SkillForm: React.FC<SkillFormProps>;
export {};

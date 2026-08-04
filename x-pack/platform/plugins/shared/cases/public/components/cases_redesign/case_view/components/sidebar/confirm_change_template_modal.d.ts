import type { FC, ReactNode } from 'react';
export interface TemplateFieldSummary {
    name: string;
    label: string;
}
export interface TemplateSummary {
    name: string;
    fieldDefinitions?: TemplateFieldSummary[];
}
export interface ConfirmChangeTemplateModalProps {
    /** The template currently applied to the case, if any. */
    oldTemplate?: TemplateSummary;
    /** The template the user picked, if any (omitted when the user is clearing the selection). */
    newTemplate?: TemplateSummary;
    /**
     * Optional field form rendered inside the modal body (e.g. `TemplateFieldsFormReady` in batch
     * mode) so the user can fill required fields before confirming the template change.
     */
    fieldsNode?: ReactNode;
    isLoading?: boolean;
    isConfirmDisabled?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}
export declare const ConfirmChangeTemplateModal: FC<ConfirmChangeTemplateModalProps>;

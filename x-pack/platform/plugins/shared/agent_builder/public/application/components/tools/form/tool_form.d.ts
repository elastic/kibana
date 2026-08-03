import React from 'react';
import type { ToolFormData } from './types/tool_form_types';
export declare enum ToolFormMode {
    Create = "create",
    Edit = "edit",
    View = "view"
}
interface BaseToolFormProps {
    formId: string;
}
interface EditableToolFormProps extends BaseToolFormProps {
    mode: ToolFormMode.Create | ToolFormMode.Edit;
    saveTool: (data: ToolFormData) => void;
}
interface ReadonlyToolFormProps extends BaseToolFormProps {
    mode: ToolFormMode.View;
    saveTool?: never;
}
export type ToolFormProps = EditableToolFormProps | ReadonlyToolFormProps;
export declare const ToolForm: ({ mode, formId, saveTool }: ToolFormProps) => React.JSX.Element;
export {};

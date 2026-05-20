import React from 'react';
import type { RoleTemplate } from '../../../../../common';
interface Props {
    roleTemplate: RoleTemplate;
    canUseInlineScripts: boolean;
    canUseStoredScripts: boolean;
    onChange: (roleTemplate: RoleTemplate) => void;
    onDelete: (roleTemplate: RoleTemplate) => void;
    readOnly?: boolean;
}
export declare const RoleTemplateEditor: ({ roleTemplate, onChange, onDelete, canUseInlineScripts, canUseStoredScripts, readOnly, }: Props) => React.JSX.Element;
export {};

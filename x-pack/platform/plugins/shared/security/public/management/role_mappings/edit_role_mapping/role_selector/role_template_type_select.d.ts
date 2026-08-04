import React from 'react';
import type { RoleTemplate } from '../../../../../common';
interface Props {
    roleTemplate: RoleTemplate;
    onChange: (roleTempplate: RoleTemplate) => void;
    canUseStoredScripts: boolean;
    canUseInlineScripts: boolean;
    readOnly?: boolean;
}
export declare const RoleTemplateTypeSelect: (props: Props) => React.JSX.Element;
export {};

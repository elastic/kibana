import React from 'react';
interface Props {
    canUseStoredScripts: boolean;
    canUseInlineScripts: boolean;
    onClick: (templateType: 'inline' | 'stored') => void;
}
export declare const AddRoleTemplateButton: (props: Props) => React.JSX.Element;
export {};

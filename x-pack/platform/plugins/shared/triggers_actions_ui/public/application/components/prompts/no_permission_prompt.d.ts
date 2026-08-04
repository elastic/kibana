import React, { type ReactNode } from 'react';
interface NoPermissionPromptProps {
    /** Overrides the default "No permissions to read rules and alerts" title. */
    title?: ReactNode;
}
export declare const NoPermissionPrompt: ({ title }?: NoPermissionPromptProps) => React.JSX.Element;
export {};

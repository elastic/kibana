import React from 'react';
interface NoDataEmptyPromptProps {
    createNewRule: () => void;
    isLoading: boolean;
    isAiEnabled: boolean;
    children?: React.ReactNode;
}
export declare const NoDataEmptyPrompt: ({ createNewRule, isLoading, isAiEnabled, children, }: NoDataEmptyPromptProps) => React.JSX.Element;
export {};

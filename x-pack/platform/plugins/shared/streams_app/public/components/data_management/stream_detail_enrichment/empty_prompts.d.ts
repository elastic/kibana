import React from 'react';
interface ProcessingButtonsManualProps {
    center?: boolean;
    color?: 'text' | 'primary';
}
export declare const ProcessingButtonsManual: ({ center, color, }: ProcessingButtonsManualProps) => React.JSX.Element | null;
interface NoStepsEmptyPromptProps {
    canUsePipelineSuggestions: boolean;
    children?: React.ReactNode;
}
export declare const RootStreamEmptyPrompt: () => React.JSX.Element;
export declare const NoStepsEmptyPrompt: ({ canUsePipelineSuggestions, children, }: NoStepsEmptyPromptProps) => React.JSX.Element;
export declare const NoPreviewDocumentsEmptyPrompt: () => React.JSX.Element;
export declare const NoProcessingDataAvailableEmptyPrompt: () => React.JSX.Element;
export {};

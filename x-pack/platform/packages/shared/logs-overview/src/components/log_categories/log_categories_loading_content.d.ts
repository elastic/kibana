import React from 'react';
export interface LogCategoriesLoadingContentProps {
    onCancel?: () => void;
    stage: 'counting' | 'categorizing';
}
export declare const LogCategoriesLoadingContent: React.FC<LogCategoriesLoadingContentProps>;

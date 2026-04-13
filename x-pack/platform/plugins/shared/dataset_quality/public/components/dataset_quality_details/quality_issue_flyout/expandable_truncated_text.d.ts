import React from 'react';
interface TruncatedTextWithToggleProps {
    text: string;
    maxCharLength?: number;
    truncatedTextLength?: number;
    codeLanguage?: string;
}
export declare const ExpandableTruncatedText: ({ text, maxCharLength, truncatedTextLength, codeLanguage, }: TruncatedTextWithToggleProps) => React.JSX.Element;
export {};

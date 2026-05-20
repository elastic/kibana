import React from 'react';
export interface ExceptionStackTraceTitleProps {
    message?: string;
    type?: string;
    codeLanguage?: string;
}
export declare function ExceptionStacktraceTitle({ message, type, codeLanguage, }: ExceptionStackTraceTitleProps): React.JSX.Element;

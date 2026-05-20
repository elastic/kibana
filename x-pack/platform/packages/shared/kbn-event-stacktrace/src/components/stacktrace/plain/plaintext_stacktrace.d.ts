import React from 'react';
interface PlaintextStacktraceProps {
    codeLanguage?: string;
    message?: string;
    stacktrace?: string;
    type?: string;
}
export declare function PlaintextStacktrace({ codeLanguage, message, stacktrace, type, }: PlaintextStacktraceProps): React.JSX.Element;
export {};

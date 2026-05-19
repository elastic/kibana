import React from 'react';
import type { Stackframe } from '@kbn/apm-types';
interface CauseStacktraceProps {
    codeLanguage?: string;
    id: string;
    message?: string;
    stackframes?: Stackframe[];
}
export declare function CauseStacktrace({ codeLanguage, id, message, stackframes, }: CauseStacktraceProps): React.JSX.Element;
export {};

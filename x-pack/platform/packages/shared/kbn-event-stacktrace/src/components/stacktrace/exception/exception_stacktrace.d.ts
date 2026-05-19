import React from 'react';
import type { Exception } from '@kbn/apm-types/es_schemas_raw';
interface ExceptionStacktraceProps {
    codeLanguage?: string;
    exceptions: Exception[];
}
export declare function ExceptionStacktrace({ codeLanguage, exceptions }: ExceptionStacktraceProps): React.JSX.Element;
export {};

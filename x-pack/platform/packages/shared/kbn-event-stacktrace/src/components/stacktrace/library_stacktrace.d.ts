import React from 'react';
import type { Stackframe } from '@kbn/apm-types';
interface Props {
    codeLanguage?: string;
    stackframes: Stackframe[];
    id: string;
}
export declare function LibraryStacktrace({ codeLanguage, id, stackframes }: Props): React.JSX.Element | null;
export {};

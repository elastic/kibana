import React from 'react';
import type { Stackframe } from '@kbn/apm-types';
interface Props {
    stackframes?: Stackframe[];
    codeLanguage?: string;
    stackTrace?: string;
}
export declare function Stacktrace({ stackframes, codeLanguage }: Props): React.JSX.Element;
interface StackframesGroup {
    isLibraryFrame: boolean;
    excludeFromGrouping: boolean;
    stackframes: Stackframe[];
}
export declare function getGroupedStackframes(stackframes: Stackframe[]): StackframesGroup[];
export {};

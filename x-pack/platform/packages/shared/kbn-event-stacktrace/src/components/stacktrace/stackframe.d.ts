import React from 'react';
import type { Stackframe as StackframeType } from '@kbn/apm-types';
interface Props {
    stackframe: StackframeType;
    codeLanguage?: string;
    id: string;
    initialIsOpen?: boolean;
    isLibraryFrame?: boolean;
}
export declare function Stackframe({ stackframe, codeLanguage, id, initialIsOpen, isLibraryFrame, }: Props): React.JSX.Element;
export {};

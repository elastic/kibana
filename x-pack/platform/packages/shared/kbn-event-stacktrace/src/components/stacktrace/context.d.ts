import React from 'react';
import type { StackframeWithLineContext } from '@kbn/apm-types';
interface Props {
    stackframe: StackframeWithLineContext;
    codeLanguage?: string;
}
export declare function Context({ stackframe, codeLanguage }: Props): React.JSX.Element;
export {};

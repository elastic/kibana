import React from 'react';
import type { Stackframe } from '@kbn/apm-types';
interface Props {
    codeLanguage?: string;
    stackframe: Stackframe;
    isLibraryFrame: boolean;
    idx: string;
}
declare function FrameHeading({ codeLanguage, stackframe, isLibraryFrame, idx }: Props): React.JSX.Element;
export { FrameHeading };

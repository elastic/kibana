import type { FunctionComponent } from 'react';
import type { ProcessorResult, Document } from '../../../types';
export interface Props {
    processorOutput?: ProcessorResult;
    documents: Document[];
    selectedDocumentIndex: number;
    updateSelectedDocument: (index: number) => void;
    isExecuting?: boolean;
}
export declare const ProcessorOutput: FunctionComponent<Props>;

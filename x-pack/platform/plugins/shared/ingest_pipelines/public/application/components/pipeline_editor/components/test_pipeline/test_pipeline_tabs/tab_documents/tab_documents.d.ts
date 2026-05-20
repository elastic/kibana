import type { FunctionComponent } from 'react';
import type { FormHook } from '../../../../../../../shared_imports';
import type { Document } from '../../../../types';
interface Props {
    validateAndTestPipeline: () => Promise<void>;
    resetTestOutput: () => void;
    isRunningTest: boolean;
    form: FormHook<{
        documents: string | Document[];
    }>;
}
export declare const TabDocuments: FunctionComponent<Props>;
export {};

import type { FunctionComponent } from 'react';
import React from 'react';
import type { FormHook } from '../../../../../shared_imports';
import type { ProcessorInternal } from '../../types';
import type { Fields } from './processor_form.container';
export interface Props {
    isOnFailure: boolean;
    form: FormHook<Fields>;
    onOpen: () => void;
    esDocsBasePath: string;
    closeFlyout: () => void;
    resetProcessors: () => void;
    handleSubmit: (shouldCloseFlyout?: boolean) => Promise<void>;
    getProcessor: () => ProcessorInternal;
    buttonRef?: React.RefObject<HTMLButtonElement | HTMLAnchorElement>;
}
export type TabType = 'configuration' | 'output';
export declare const EditProcessorForm: FunctionComponent<Props>;

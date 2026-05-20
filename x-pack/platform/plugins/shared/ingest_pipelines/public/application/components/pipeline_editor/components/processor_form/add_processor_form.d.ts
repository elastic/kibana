import type { FunctionComponent } from 'react';
import React from 'react';
import type { FormHook } from '../../../../../shared_imports';
import type { Fields } from './processor_form.container';
export interface Props {
    isOnFailure: boolean;
    form: FormHook<Fields>;
    onOpen: () => void;
    esDocsBasePath: string;
    closeFlyout: () => void;
    handleSubmit: (shouldCloseFlyout?: boolean) => Promise<void>;
    buttonRef?: React.RefObject<HTMLButtonElement | HTMLAnchorElement>;
}
export declare const AddProcessorForm: FunctionComponent<Props>;

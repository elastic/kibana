import type { FunctionComponent } from 'react';
import React from 'react';
import type { OnFormUpdateArg } from '../../../../../shared_imports';
import type { ProcessorInternal } from '../../types';
export type ProcessorFormOnSubmitArg = Omit<ProcessorInternal, 'id'>;
export type OnSubmitHandler = (processor: ProcessorFormOnSubmitArg) => void;
export type OnFormUpdateHandler = (form: OnFormUpdateArg<any>) => void;
export interface Fields {
    type: string;
    fields: {
        [key: string]: any;
    };
}
interface Props {
    onFormUpdate: OnFormUpdateHandler;
    onSubmit: OnSubmitHandler;
    isOnFailure: boolean;
    onOpen: () => void;
    onClose: () => void;
    processor?: ProcessorInternal;
    buttonRef?: React.RefObject<HTMLButtonElement | HTMLAnchorElement>;
}
export declare const ProcessorFormContainer: FunctionComponent<Props>;
export {};

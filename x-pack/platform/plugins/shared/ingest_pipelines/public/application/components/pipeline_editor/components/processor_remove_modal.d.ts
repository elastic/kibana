import React from 'react';
import type { ProcessorInternal, ProcessorSelector } from '../types';
interface Props {
    processor: ProcessorInternal;
    selector: ProcessorSelector;
    onResult: (arg: {
        confirmed: boolean;
        selector: ProcessorSelector;
    }) => void;
}
export declare const ProcessorRemoveModal: ({ processor, onResult, selector }: Props) => React.JSX.Element;
export {};

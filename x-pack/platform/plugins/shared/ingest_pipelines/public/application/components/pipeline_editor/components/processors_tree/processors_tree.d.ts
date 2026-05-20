import type { FunctionComponent } from 'react';
import React from 'react';
import type { ProcessorInternal, ProcessorSelector } from '../../types';
export interface ProcessorInfo {
    id: string;
    selector: ProcessorSelector;
    aboveId?: string;
    belowId?: string;
}
export type Action = {
    type: 'move';
    payload: {
        source: ProcessorSelector;
        destination: ProcessorSelector;
    };
} | {
    type: 'selectToMove';
    payload: {
        info: ProcessorInfo;
    };
} | {
    type: 'cancelMove';
} | {
    type: 'addProcessor';
    payload: {
        target: ProcessorSelector;
        buttonRef?: React.RefObject<HTMLButtonElement>;
    };
};
export type OnActionHandler = (action: Action) => void;
export interface Props {
    processors: ProcessorInternal[];
    baseSelector: ProcessorSelector;
    onAction: OnActionHandler;
    movingProcessor?: ProcessorInfo;
    movingProcessorLabel?: string;
    'data-test-subj'?: string;
}
/**
 * This component is the public interface to our optimised tree rendering private components and
 * also contains top-level state concerns for an instance of the component
 */
export declare const ProcessorsTree: FunctionComponent<Props>;

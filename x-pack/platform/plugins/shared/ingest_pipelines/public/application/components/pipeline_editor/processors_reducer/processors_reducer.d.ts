import type { Reducer, Dispatch } from 'react';
import type { DeserializeResult } from '../deserialize';
import type { ProcessorInternal, ProcessorSelector } from '../types';
export type State = Omit<DeserializeResult, 'onFailure'> & {
    onFailure: ProcessorInternal[];
    isRoot: true;
};
export type Action = {
    type: 'addProcessor';
    payload: {
        processor: Omit<ProcessorInternal, 'id'>;
        targetSelector: ProcessorSelector;
    };
} | {
    type: 'updateProcessor';
    payload: {
        processor: ProcessorInternal;
        selector: ProcessorSelector;
    };
} | {
    type: 'removeProcessor';
    payload: {
        selector: ProcessorSelector;
    };
} | {
    type: 'moveProcessor';
    payload: {
        source: ProcessorSelector;
        destination: ProcessorSelector;
    };
} | {
    type: 'duplicateProcessor';
    payload: {
        source: ProcessorSelector;
    };
} | {
    type: 'loadProcessors';
    payload: {
        newState: DeserializeResult;
    };
};
export type ProcessorsDispatch = Dispatch<Action>;
export declare const reducer: Reducer<State, Action>;
export declare const useProcessorsState: (initialState: DeserializeResult) => [State, Dispatch<Action>];

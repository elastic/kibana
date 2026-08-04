import React, { type PropsWithChildren } from 'react';
import type { BuilderState } from './types';
interface BuilderStateContextValue {
    builderState: BuilderState;
    setBuilderState: (state: BuilderState) => void;
}
export declare const BuilderStateProvider: React.FC<PropsWithChildren<BuilderStateContextValue>>;
export declare const useBuilderState: <T>() => {
    state: T;
    setState: (s: T) => void;
};
export {};

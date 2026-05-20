import type { FunctionComponent } from 'react';
import React from 'react';
import type { Props as ProcessorsContextProps } from './processors_context';
interface Props extends ProcessorsContextProps {
    children: React.ReactNode;
}
export declare const ProcessorsEditorContextProvider: FunctionComponent<Props>;
export {};

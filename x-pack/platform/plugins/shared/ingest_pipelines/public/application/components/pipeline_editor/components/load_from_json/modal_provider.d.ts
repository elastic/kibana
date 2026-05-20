import type { FunctionComponent } from 'react';
import React from 'react';
import type { Processor } from '../../../../../../common/types';
export type OnDoneLoadJsonHandler = (json: {
    processors: Processor[];
    on_failure?: Processor[];
}) => void;
export interface Props {
    onDone: OnDoneLoadJsonHandler;
    children: (openModal: () => void) => React.ReactNode;
}
export declare const ModalProvider: FunctionComponent<Props>;

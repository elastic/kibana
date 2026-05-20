import type { FunctionComponent } from 'react';
import React from 'react';
import type { Processor } from '../../../../../common/types';
import type { OnUpdateHandlerArg, ContextValue } from '../types';
export interface Props {
    value: {
        processors: Processor[];
        onFailure?: Processor[];
    };
    /**
     * Give users a way to react to this component opening a flyout
     */
    onFlyoutOpen: () => void;
    onUpdate: (arg: OnUpdateHandlerArg) => void;
    children?: React.ReactNode;
}
export declare const PipelineProcessorsContextProvider: FunctionComponent<Props>;
export declare const usePipelineProcessorsContext: () => ContextValue;

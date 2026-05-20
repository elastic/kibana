import type { FunctionComponent } from 'react';
import React from 'react';
import type { ProcessorInternal, ProcessorSelector, ContextValueEditor } from '../../types';
import type { ProcessorsDispatch } from '../../processors_reducer';
import type { ProcessorInfo } from '../processors_tree';
import type { Handlers } from './types';
export interface Props {
    processor: ProcessorInternal;
    processorsDispatch: ProcessorsDispatch;
    editor: ContextValueEditor;
    handlers: Handlers;
    selector: ProcessorSelector;
    description?: string;
    movingProcessor?: ProcessorInfo;
    renderOnFailureHandlers?: () => React.ReactNode;
}
export declare const PipelineProcessorsEditorItem: FunctionComponent<Props>;

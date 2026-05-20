import type { FunctionComponent, MutableRefObject } from 'react';
import type List from 'react-virtualized/dist/commonjs/List';
import type WindowScroller from 'react-virtualized/dist/commonjs/WindowScroller';
import type { ProcessorInternal, ProcessorSelector } from '../../../types';
import type { OnActionHandler, ProcessorInfo } from '../processors_tree';
export interface PrivateProps {
    processors: ProcessorInternal[];
    selector: ProcessorSelector;
    onAction: OnActionHandler;
    level: number;
    movingProcessor?: ProcessorInfo;
    movingProcessorLabel?: string;
    windowScrollerRef?: MutableRefObject<WindowScroller | null>;
    listRef?: MutableRefObject<List | null>;
}
/**
 * Recursively rendering tree component for ingest pipeline processors.
 *
 * Note: this tree should start at level 1. It is the only level at
 * which we render the optimised virtual component. This gives a
 * massive performance boost to this component which can get very tall.
 *
 * The first level list also contains the outside click listener which
 * enables users to click outside of the tree and cancel moving a
 * processor.
 */
export declare const PrivateTree: FunctionComponent<PrivateProps>;

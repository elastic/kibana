import type { FunctionComponent } from 'react';
import type { ProcessorInternal } from '../../../types';
import type { ProcessorInfo, OnActionHandler } from '../processors_tree';
export interface Props {
    processor: ProcessorInternal;
    processorInfo: ProcessorInfo;
    onAction: OnActionHandler;
    level: number;
    movingProcessor?: ProcessorInfo;
    movingProcessorLabel?: string;
}
export declare const TreeNode: FunctionComponent<Props>;

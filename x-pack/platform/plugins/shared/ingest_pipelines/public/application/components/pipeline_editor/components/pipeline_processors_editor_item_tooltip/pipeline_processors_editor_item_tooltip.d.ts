import type { FunctionComponent } from 'react';
import type { ProcessorInternal } from '../../types';
export interface Position {
    x: number;
    y: number;
}
interface Props {
    processor: ProcessorInternal;
}
export declare const PipelineProcessorsItemTooltip: FunctionComponent<Props>;
export {};

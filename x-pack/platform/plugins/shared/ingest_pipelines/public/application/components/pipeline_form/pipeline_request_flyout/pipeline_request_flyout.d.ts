import type { FunctionComponent } from 'react';
import type { ReadProcessorsFunction } from '../types';
interface Props {
    closeFlyout: () => void;
    readProcessors: ReadProcessorsFunction;
}
export declare const PipelineRequestFlyout: FunctionComponent<Props>;
export {};

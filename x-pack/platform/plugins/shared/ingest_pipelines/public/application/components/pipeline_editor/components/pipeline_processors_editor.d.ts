import type { FunctionComponent } from 'react';
import type { ON_FAILURE_STATE_SCOPE, PROCESSOR_STATE_SCOPE } from '../processors_reducer';
export interface Props {
    stateSlice: typeof ON_FAILURE_STATE_SCOPE | typeof PROCESSOR_STATE_SCOPE;
}
export declare const PipelineProcessorsEditor: FunctionComponent<Props>;

import type { FC } from 'react';
import type { MlInferenceState } from '../types';
import { type TestPipelineMode } from '../types';
interface Props {
    sourceIndex?: string;
    state: MlInferenceState;
    mode: TestPipelineMode;
}
export declare const TestPipeline: FC<Props>;
export {};

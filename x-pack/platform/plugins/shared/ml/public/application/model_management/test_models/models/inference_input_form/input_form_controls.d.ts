import type { FC } from 'react';
import type { InferrerType } from '..';
interface Props {
    testButtonDisabled: boolean;
    createPipelineButtonDisabled: boolean;
    inferrer: InferrerType;
    showCreatePipelineButton?: boolean;
}
export declare const InputFormControls: FC<Props>;
export {};

import type { FC } from 'react';
interface Props {
    handlePipelineConfigUpdate: (configUpdate: Partial<any>) => void;
    pipelineNameError: string | undefined;
    pipelineDescription: string;
    pipelineName: string;
}
export declare const PipelineNameAndDescription: FC<Props>;
export {};

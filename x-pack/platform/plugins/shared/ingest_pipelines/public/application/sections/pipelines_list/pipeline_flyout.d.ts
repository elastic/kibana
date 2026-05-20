import type { FunctionComponent } from 'react';
import type { Pipeline } from '../../../../common/types';
export interface Props {
    ingestPipeline: string;
    onClose: () => void;
    onCreateClick: (pipelineName: string) => void;
    onEditClick: (pipelineName: string) => void;
    onCloneClick: (pipelineName: string) => void;
    onDeleteClick: (pipelineName: Pipeline[]) => void;
}
export declare const PipelineFlyout: FunctionComponent<Props>;

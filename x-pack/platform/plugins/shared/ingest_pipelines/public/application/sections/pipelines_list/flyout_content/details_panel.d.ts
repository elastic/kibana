import type { FunctionComponent } from 'react';
import type { Pipeline } from '../../../../../common/types';
export interface Props {
    pipeline: Pipeline;
    isLoading: boolean;
    onEditClick: (pipelineName: string) => void;
    onCloneClick: (pipelineName: string) => void;
    onDeleteClick: (pipelineName: Pipeline[]) => void;
    renderActions: boolean;
    renderViewTreeButton: boolean;
    onViewTreeClick: () => void;
}
export declare const DetailsPanel: FunctionComponent<Props>;

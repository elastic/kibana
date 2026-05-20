import React from 'react';
import type { Pipeline } from '../../../../common/types';
export declare const PipelineDeleteModal: ({ pipelinesToDelete, callback, }: {
    pipelinesToDelete: Pipeline[];
    callback: (data?: {
        hasDeletedPipelines: boolean;
    }) => void;
}) => React.JSX.Element;

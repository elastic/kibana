import React from 'react';
interface PipelineSelectorProps {
    pipelineIds: string[];
    selectedPipelineId: string;
    onChange: (pipelineId: string) => void;
}
export declare const PipelineSelector: React.FunctionComponent<PipelineSelectorProps>;
export {};

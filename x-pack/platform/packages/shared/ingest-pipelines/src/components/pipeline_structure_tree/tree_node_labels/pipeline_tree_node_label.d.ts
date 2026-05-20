import React from 'react';
interface PipelineTreeNodeLabelProps {
    pipelineName: string;
    isManaged: boolean;
    isDeprecated: boolean;
    isSelected?: boolean;
    onClick: () => void;
    level: number;
}
export declare const PipelineTreeNodeLabel: ({ pipelineName, isManaged, isDeprecated, isSelected, onClick, level, }: PipelineTreeNodeLabelProps) => React.JSX.Element;
export {};

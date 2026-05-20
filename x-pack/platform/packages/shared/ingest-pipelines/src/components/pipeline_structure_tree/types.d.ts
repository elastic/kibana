export interface PipelineTreeNode {
    pipelineName: string;
    isManaged: boolean;
    isDeprecated: boolean;
    children: PipelineTreeNode[];
}

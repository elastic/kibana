import React from 'react';
import type { PipelineTreeNode } from './types';
export interface PipelineStructureTreeProps {
    pipelineTree: PipelineTreeNode;
    selectedPipeline: string | undefined;
    /**
     * Specifies whether the tree is an extension of the main tree; i.e. displayed
     * when the user clicks on the last "+X more pipelines" tree node.
     */
    isExtension: boolean;
    clickTreeNode: (name: string) => void;
    clickMorePipelines: (name: string) => void;
    goBack: () => void;
}
/**
 * A component for a Pipeline structure tree.
 * Children pipeline nodes represent Pipeline processors that run the
 * corresponding pipelines from the children node.
 * See more at https://www.elastic.co/docs/reference/enrich-processor/pipeline-processor
 */
export declare const PipelineStructureTree: React.MemoExoticComponent<({ pipelineTree, selectedPipeline, isExtension, clickTreeNode, clickMorePipelines, goBack, }: PipelineStructureTreeProps) => React.JSX.Element>;

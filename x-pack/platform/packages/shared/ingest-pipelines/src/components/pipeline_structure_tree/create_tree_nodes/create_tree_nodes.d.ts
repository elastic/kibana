import type { Node } from '@elastic/eui/src/components/tree_view/tree_view';
import type { PipelineTreeNode } from '../types';
/**
 * This function takes a {@link PipelineTreeNode} tree of pipeline names, traverses it
 * recursively, and returns a Node tree that can be passed to an {@link EuiTreeView}.
 */
export declare const createTreeNodesFromPipelines: (treeNode: PipelineTreeNode, selectedPipeline: string | undefined, clickTreeNode: (pipelineName: string) => void, clickMorePipelines: (name: string) => void, level?: number) => Node;

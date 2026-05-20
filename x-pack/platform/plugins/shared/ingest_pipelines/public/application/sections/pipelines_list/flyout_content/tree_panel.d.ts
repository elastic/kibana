import type { PipelineTreeNode } from '@kbn/ingest-pipelines-shared';
import React from 'react';
interface Props {
    pipelineTree: PipelineTreeNode;
    setTreeRootStack: React.Dispatch<React.SetStateAction<string[]>>;
    selectedPipeline: string | undefined;
    clickTreeNode: (name: string) => void;
    isExtension: boolean;
}
export declare const TreePanel: React.MemoExoticComponent<({ pipelineTree, selectedPipeline, clickTreeNode, setTreeRootStack, isExtension }: Props) => React.JSX.Element>;
export {};

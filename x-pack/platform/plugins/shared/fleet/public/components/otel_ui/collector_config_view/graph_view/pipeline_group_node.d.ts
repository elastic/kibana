import React from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import type { OTelPipelineGroupNodeData } from './config_to_graph';
type PipelineGroupNodeType = Node<OTelPipelineGroupNodeData, 'pipelineGroup'>;
export declare const PipelineGroupNode: React.MemoExoticComponent<({ data }: NodeProps<PipelineGroupNodeType>) => React.JSX.Element>;
export {};

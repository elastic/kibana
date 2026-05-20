import React from 'react';
import type { Node } from '@xyflow/react';
import { type NodeProps } from '@xyflow/react';
import type { JOB_MAP_FLOW_NODE_TYPE } from '../map_elements_to_flow';
import { type JobMapNodeData } from '../map_elements_to_flow';
type JobMapFlowNodeType = Node<JobMapNodeData, typeof JOB_MAP_FLOW_NODE_TYPE>;
export declare const JobMapFlowNode: React.MemoExoticComponent<({ data, selected }: NodeProps<JobMapFlowNodeType>) => React.JSX.Element>;
export {};

import React from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import type { OTelGraphNodeData } from './constants';
type ComponentNodeType = Node<OTelGraphNodeData, 'component'>;
export declare const ComponentNode: React.MemoExoticComponent<({ data, selected, sourcePosition, targetPosition }: NodeProps<ComponentNodeType>) => React.JSX.Element>;
export {};

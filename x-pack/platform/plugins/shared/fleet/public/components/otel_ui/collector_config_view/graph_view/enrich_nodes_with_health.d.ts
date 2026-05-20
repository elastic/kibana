import type { Node } from '@xyflow/react';
import type { ComponentHealth } from '../../../../../common/types';
export { findComponentHealth } from '../utils';
export declare const enrichNodesWithHealth: (nodes: Array<Node>, health: ComponentHealth | undefined) => void;

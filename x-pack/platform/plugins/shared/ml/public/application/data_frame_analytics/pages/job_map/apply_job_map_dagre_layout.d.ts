import type { Edge, Node } from '@xyflow/react';
export interface JobMapLayoutOptions {
    rankdir?: 'TB' | 'LR';
    ranksep?: number;
    nodesep?: number;
    marginx?: number;
    marginy?: number;
    nodeWidth?: number;
    nodeHeight?: number;
}
export declare function applyJobMapDagreLayout<T extends Record<string, unknown>>(nodes: Node<T>[], edges: Edge[], options?: JobMapLayoutOptions): Node<T>[];

import { type Node, type Edge } from '@xyflow/react';
interface LayoutOptions {
    rankdir?: 'TB' | 'LR';
    ranksep?: number;
    nodesep?: number;
    marginx?: number;
    marginy?: number;
    nodeWidth?: number;
    nodeHeight?: number;
}
export declare const applyDagreLayout: <T extends Node>(nodes: T[], edges: Edge[], options?: LayoutOptions) => T[];
export {};

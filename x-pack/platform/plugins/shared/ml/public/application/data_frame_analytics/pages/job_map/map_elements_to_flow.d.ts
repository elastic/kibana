import type { Edge, Node } from '@xyflow/react';
import type { AnalyticsMapNodeElement, MapElements } from '@kbn/ml-data-frame-analytics-utils';
export declare const JOB_MAP_FLOW_NODE_TYPE: "jobMapNode";
export interface JobMapNodeData extends Record<string, unknown> {
    id: string;
    label: string;
    type: string;
    analysisType?: string;
    isRoot?: boolean;
}
export declare function isNodeElement(el: MapElements): el is AnalyticsMapNodeElement;
export declare function mapElementsToFlowGraph(elements: MapElements[], edgeColor: string): {
    nodes: Node<JobMapNodeData>[];
    edges: Edge[];
};

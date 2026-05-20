import type { Node, Edge } from '@xyflow/react';
import type { OTelCollectorConfig } from '../../../../../common/types';
import { type ComponentHealthStatus } from '../utils';
import type { OTelGraphNodeData } from './constants';
export interface OTelPipelineGroupNodeData {
    label: string;
    isSelected?: boolean;
    healthStatus?: ComponentHealthStatus;
    healthCounts?: {
        healthy: number;
        total: number;
    };
    [key: string]: unknown;
}
interface ConfigToGraphResult {
    nodes: Array<Node<OTelGraphNodeData> | Node<OTelPipelineGroupNodeData>>;
    edges: Edge[];
    isMergedView: boolean;
}
export declare const configToGraph: (config: OTelCollectorConfig, selectedPipelineId?: string) => ConfigToGraphResult;
export {};

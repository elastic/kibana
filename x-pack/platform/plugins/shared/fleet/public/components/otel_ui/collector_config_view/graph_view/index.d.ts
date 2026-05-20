import React from 'react';
import '@xyflow/react/dist/style.css';
import type { OTelCollectorConfig, ComponentHealth } from '../../../../../common/types';
interface GraphViewProps {
    config: OTelCollectorConfig;
    selectedPipelineId: string;
    health?: ComponentHealth;
}
export declare const GraphView: React.FunctionComponent<GraphViewProps>;
export {};

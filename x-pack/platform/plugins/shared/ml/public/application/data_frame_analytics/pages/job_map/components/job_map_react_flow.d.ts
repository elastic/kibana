import type { FC } from 'react';
import type { MapElements } from '@kbn/ml-data-frame-analytics-utils';
import '@xyflow/react/dist/style.css';
import { type JobMapNodeData } from '../map_elements_to_flow';
export interface JobMapReactFlowProps {
    elements: MapElements[];
    width: number;
    height: number;
    resetViewportSignal: number;
    selectedNodeId: string | undefined;
    onSelectNodeData: (data: JobMapNodeData) => void;
    onClearSelection: () => void;
}
export declare const JobMapReactFlow: FC<JobMapReactFlowProps>;

import type { FC } from 'react';
import type { JobMapNodeData } from '../map_elements_to_flow';
import type { GetDataObjectParameter } from '../use_fetch_analytics_map_data';
interface Props {
    details: Record<string, any>;
    getNodeData: (params?: GetDataObjectParameter) => void;
    modelId?: string;
    selectedNodeData: JobMapNodeData | undefined;
    onClearSelection: () => void;
    updateElements: (nodeId: string, nodeLabel: string, destIndexNode?: string) => void;
    refreshJobsCallback: () => void;
}
export declare const JobMapNodeFlyout: FC<Props>;
export {};

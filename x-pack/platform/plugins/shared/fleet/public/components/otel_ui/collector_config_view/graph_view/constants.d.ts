import type { ComponentHealthStatus } from '../utils';
import type { OTelComponentType } from '../constants';
export { type OTelComponentType, COMPONENT_TYPE_VIS_COLORS, COMPONENT_TYPE_LABELS, } from '../constants';
export declare const NODE_WIDTH = 200;
export declare const NODE_HEIGHT = 60;
export declare const RANK_SEPARATION = 80;
export declare const NODE_SEPARATION = 30;
export declare const GRAPH_MARGIN = 20;
export declare const GROUP_PADDING = 40;
export declare const DETAIL_PANEL_CONTENT_MAX_HEIGHT = 390;
export interface OTelGraphNodeData {
    label: string;
    componentType: OTelComponentType;
    pipelineId?: string;
    healthStatus?: ComponentHealthStatus;
    [key: string]: unknown;
}

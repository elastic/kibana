import type { ChartType } from '@kbn/visualization-utils';
export interface VisualizationElementAttributes {
    toolResultId?: string;
    chartType?: ChartType;
}
export declare const visualizationElement: {
    tagName: string;
    attributes: {
        toolResultId: string;
        chartType: string;
    };
};
export interface DashboardElementAttributes {
    toolResultId?: string;
}
export declare const dashboardElement: {
    tagName: string;
    attributes: {
        toolResultId: string;
    };
};
export interface RenderAttachmentElementAttributes {
    attachmentId?: string;
    version?: number | string;
}
export declare const renderAttachmentElement: {
    tagName: string;
    attributes: {
        attachmentId: string;
        version: string;
    };
};

import React from 'react';
export type FlowCanvasDataProduct = 'metrics' | 'logs';
export declare function inferFlowCanvasDataProduct(streamName: string): FlowCanvasDataProduct;
export interface FlowCanvasQualityStatusBadgeProps {
    readonly status: 'good' | 'degraded' | 'poor';
}
/** Icon-only quality badge (good / degraded / poor) for flow canvas cards. */
export declare function FlowCanvasQualityStatusBadge({ status }: FlowCanvasQualityStatusBadgeProps): React.JSX.Element;
export interface FlowCanvasDataProductTextBadgeProps {
    readonly dataProduct: FlowCanvasDataProduct;
}
export declare function FlowCanvasDataProductTextBadge({ dataProduct, }: FlowCanvasDataProductTextBadgeProps): React.JSX.Element;

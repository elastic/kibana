import type { ReactNode } from 'react';
import React from 'react';
import { type FlowCanvasDataProduct } from './ingest_hub_demo_streams_flow_card_badge_row';
export interface IngestHubDemoStreamsFlowDestinationCardProps {
    readonly title: ReactNode;
    /** Full stream name (or demo label) for truncation tooltip content. */
    readonly titleTooltip: string;
    readonly metricsLine: string;
    readonly quality?: 'good' | 'degraded' | 'poor';
    readonly dataProduct: FlowCanvasDataProduct;
    readonly trailingAction?: ReactNode;
    readonly dimmed: boolean;
}
export declare function IngestHubDemoStreamsFlowDestinationCard({ title, titleTooltip, metricsLine, quality, dataProduct, trailingAction, dimmed, }: IngestHubDemoStreamsFlowDestinationCardProps): React.JSX.Element;

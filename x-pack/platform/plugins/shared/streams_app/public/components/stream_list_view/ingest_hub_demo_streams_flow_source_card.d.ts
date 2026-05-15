import React from 'react';
import { type FlowCanvasDataProduct } from './ingest_hub_demo_streams_flow_card_badge_row';
export interface IngestHubDemoStreamsFlowSourceCardProps {
    readonly title: string;
    readonly metricsLine: string;
    /** When omitted, the card is treated as good quality. */
    readonly quality?: 'good' | 'degraded' | 'poor';
    readonly dataProduct: FlowCanvasDataProduct;
    readonly dimmed: boolean;
}
export declare function IngestHubDemoStreamsFlowSourceCard({ title, metricsLine, quality, dataProduct, dimmed, }: IngestHubDemoStreamsFlowSourceCardProps): React.JSX.Element;

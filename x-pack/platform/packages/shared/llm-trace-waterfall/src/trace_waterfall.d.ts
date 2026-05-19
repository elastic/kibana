import React from 'react';
import type { TraceSpan } from './types';
export { SpanDetail } from './span_detail';
export type { SpanNode } from './types';
export interface TraceWaterfallProps {
    spans: TraceSpan[];
    traceId?: string;
    durationMs?: number;
    isLoading?: boolean;
    error?: Error | null;
    layout?: 'vertical' | 'horizontal';
    hideNoiseDefault?: boolean;
}
export declare const TraceWaterfall: React.FC<TraceWaterfallProps>;

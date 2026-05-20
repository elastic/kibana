import React from 'react';
import type { TraceSpan } from './types';
interface SpanWithDepth extends TraceSpan {
    depth: number;
}
interface WaterfallItemProps {
    span: SpanWithDepth;
    traceStartMs: number;
    traceDurationMs: number;
    isSelected: boolean;
    isFocused: boolean;
    onClick: () => void;
    tickPercents: number[];
}
export declare const LABEL_WIDTH = 360;
export declare const INDENT_PX = 16;
export type SpanCategory = 'llm' | 'tool' | 'search' | 'http' | 'other';
export declare const SPAN_COLORS: Record<SpanCategory, string>;
export declare const getSpanCategory: (span: TraceSpan) => SpanCategory;
export declare const WaterfallItem: React.FC<WaterfallItemProps>;
export {};

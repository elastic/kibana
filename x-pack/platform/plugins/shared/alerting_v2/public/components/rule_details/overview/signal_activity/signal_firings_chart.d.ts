import React from 'react';
import type { SignalFiringBucket } from '../../../../hooks/use_fetch_signal_firings';
export interface SignalFiringsChartProps {
    buckets: SignalFiringBucket[];
    gteMs: number;
    lteMs: number;
    /** Histogram bucket width in epoch ms; required so sparse buckets render at full width. */
    minIntervalMs: number;
    timeZone?: string;
    /** Called when the user drag-selects a range on the chart (epoch ms). */
    onBrushRange: (fromMs: number, toMs: number) => void;
}
export declare const SignalFiringsChart: React.FC<SignalFiringsChartProps>;

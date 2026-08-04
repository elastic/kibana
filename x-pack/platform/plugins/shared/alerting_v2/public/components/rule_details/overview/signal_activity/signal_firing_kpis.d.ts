import type { SignalFiringBucket } from '../../../../hooks/use_fetch_signal_firings';
export type FiringRateUnit = 'hour' | 'day';
export interface SignalFiringKpis {
    totalFirings: number;
    /** Average firings per `averageUnit` over the window. */
    average: number;
    averageUnit: FiringRateUnit;
}
/**
 * Derives the signal overview KPIs from the bucketed histogram. The average's
 * unit tracks the chart's bucket interval so the KPI and bars tell one story:
 * fine windows report per-hour, week+ windows report per-day.
 */
export declare const deriveSignalFiringKpis: (buckets: SignalFiringBucket[], gteMs: number, lteMs: number, interval: string) => SignalFiringKpis;

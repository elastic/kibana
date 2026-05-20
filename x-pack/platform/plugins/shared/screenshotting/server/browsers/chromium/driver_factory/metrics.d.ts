import { type Protocol } from 'devtools-protocol';
import type { PerformanceMetrics } from '../../../../common/types';
export type Metrics = Protocol.Performance.GetMetricsResponse;
export declare function getMetrics(start: Metrics, end: Metrics): PerformanceMetrics;

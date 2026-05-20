import type { SeverityThreshold } from '@kbn/ml-server-schemas/embeddables/anomaly_charts';
export interface SeverityOption {
    val: number;
    display: string;
    color: string;
    threshold: SeverityThreshold;
}
/**
 * React hook that returns severity options with their display values and colors
 */
export declare const useSeverityOptions: () => SeverityOption[];

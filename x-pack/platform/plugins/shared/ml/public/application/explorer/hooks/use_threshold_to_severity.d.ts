import type { SeverityThreshold } from '@kbn/ml-server-schemas/embeddables/anomaly_charts';
/**
 * React hook that returns a function to find severity options by threshold values
 * @returns A function that converts threshold objects to severity options
 */
export declare const useThresholdToSeverity: () => (thresholds: SeverityThreshold[]) => import("./use_severity_options").SeverityOption[];

import type { SeverityThreshold } from '@kbn/ml-server-schemas/embeddables/anomaly_charts';
/**
 * Utility function to resolve severity format from old to new format
 * @param value - The severity value which could be in old (number) or new (array) format
 * @returns Resolved severity value in the new format (array)
 */
export declare const resolveSeverityFormat: (value: number | SeverityThreshold[]) => SeverityThreshold[];

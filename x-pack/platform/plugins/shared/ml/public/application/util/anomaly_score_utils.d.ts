import type { SeverityThreshold } from '@kbn/ml-server-schemas/embeddables/anomaly_charts';
/**
 * Determines if a point should be included based on its score and selected severity thresholds
 * @param score - The anomaly score
 * @param selectedSeverity - Array of selected severity thresholds
 * @returns True if the point should be included in the results
 */
export declare function shouldIncludePointByScore(score: number, selectedSeverity: SeverityThreshold[]): boolean;

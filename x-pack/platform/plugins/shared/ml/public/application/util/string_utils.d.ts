import type { MlCustomUrlAnomalyRecordDoc } from '@kbn/ml-anomaly-utils';
import type { DataGridItem } from '@kbn/ml-data-grid';
import type { Detector } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
export declare function replaceStringTokens(str: string, valuesByTokenName: MlCustomUrlAnomalyRecordDoc | DataGridItem, encodeForURI: boolean): string;
export declare function detectorToString(dtr: Detector): string;
export declare function toLocaleString(x: number | undefined | null): string;
export declare function mlEscape(str: string): string;
export declare function escapeForElasticsearchQuery(str: string): string;
export declare function escapeKueryForFieldValuePair(name: string, value: string | number | boolean | undefined): string;
/**
 *
 * Helper function to returns escaped combined field name and value
 * which also replaces empty str with " to ensure compatability with kql queries
 * @param name fieldName of selection
 * @param value fieldValue of selection
 * @returns {string} escaped `name:value` compatible with embeddable input
 */
export declare function escapeKueryForEmbeddableFieldValuePair(name: string, value: string | number | boolean | undefined): string;
export declare function calculateTextWidth(txt: string | number, isNumber: boolean): number;
export declare function stringMatch(str: string | undefined, substr: any): boolean;

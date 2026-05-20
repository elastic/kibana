import { type RisonValue } from '@kbn/rison';
import type { TimeRange } from '@kbn/es-query';
import type { MlAnomalyRecordDoc, MlUrlConfig, MlKibanaUrlConfig, MlCustomUrlAnomalyRecordDoc } from '@kbn/ml-anomaly-utils';
import type { DataGridItem } from '@kbn/ml-data-grid';
export declare function replaceTokensInDFAUrlValue(customUrlConfig: MlUrlConfig | MlKibanaUrlConfig, doc: DataGridItem, timeRange?: TimeRange): string;
export declare function replaceTokensInUrlValue(customUrlConfig: MlUrlConfig | MlKibanaUrlConfig, jobBucketSpanSecs: number, doc: MlAnomalyRecordDoc | Record<string, unknown>, timeFieldName: 'timestamp' | string): string;
export declare function getUrlForRecord(urlConfig: MlUrlConfig | MlKibanaUrlConfig, record: MlCustomUrlAnomalyRecordDoc | DataGridItem): string;
export declare function openCustomUrlWindow(url: string, urlConfig: MlUrlConfig, basePath: string): void;
/**
 * Escape any double quotes in the value for correct use in KQL.
 */
export declare function escapeForKQL(value: string | number): string;
export declare const isRisonObject: (value: RisonValue) => value is Record<string, RisonValue>;
/**
 * Helper to grab field value from the string containing field value & name
 * which also handle special characters like colons and spaces
 * `odd:field$name&:"$odd:field$name&$"` => 'odd:field$name&'
 */
export declare const getQueryField: (str: string) => string;
export declare function isValidLabel(label: string, savedCustomUrls: any[]): boolean;
export declare function isValidTimeRange(timeRange: string): boolean;

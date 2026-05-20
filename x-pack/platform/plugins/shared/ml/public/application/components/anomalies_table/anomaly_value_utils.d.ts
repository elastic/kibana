import type { AnomalyDateFunction, MlAnomalyRecordDoc } from '@kbn/ml-anomaly-utils/types';
interface TimeValueInfo {
    formattedTime: string;
    tooltipContent: string;
    dayOffset?: number;
}
/**
 * Type guard to check if a function is a time-based function
 */
export declare function isTimeFunction(functionName?: string): functionName is AnomalyDateFunction;
/**
 * Gets formatted time information for time-based functions
 */
export declare function useTimeValueInfo(value: number, functionName: string, record?: MlAnomalyRecordDoc): TimeValueInfo | null;
export {};

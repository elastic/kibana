import type { Moment } from 'moment-timezone';
import { type MlAnomalyRecordDoc } from '@kbn/ml-anomaly-utils';
import type { AnomalyDateFunction } from '@kbn/ml-anomaly-utils/types';
interface TimeValueResultBase {
    formatted: string;
    moment: Moment;
}
interface TimeOfDayValueResult extends TimeValueResultBase {
    dayOffset: number;
}
interface TimeOfWeekValueResult extends TimeValueResultBase {
    dayOffset?: never;
}
export type TimeValueResult = TimeOfDayValueResult | TimeOfWeekValueResult;
/**
 * Formats `time_of_day` and `time_of_week` ML values into a display time and
 * returns the resolved display moment so callers can render it differently per surface.
 */
export declare function formatTimeValue(value: number, mlFunction: AnomalyDateFunction, record?: MlAnomalyRecordDoc, timezone?: string): TimeValueResult;
export {};

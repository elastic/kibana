import type { MlAnomalyRecordDoc } from '@kbn/ml-anomaly-utils';
import type { AnomalyDateFunction } from '@kbn/ml-anomaly-utils/types';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
export declare function formatValue(value: number[] | number, mlFunction: string, fieldFormat?: FieldFormat, record?: MlAnomalyRecordDoc): string | number;
export declare function formatSingleValue(value: number, mlFunction?: string, fieldFormat?: FieldFormat, record?: MlAnomalyRecordDoc): string | number;
export declare function formatTimeValue(value: number, mlFunction: AnomalyDateFunction, record?: MlAnomalyRecordDoc): import("../../../common/util/format_time_value").TimeValueResult;

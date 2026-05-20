import type { MlAnomaliesTableRecord, MlEntityField } from '@kbn/ml-anomaly-utils';
export declare function getTableItemClosestToTimestamp(anomalies: MlAnomaliesTableRecord[], anomalyTime: number, entityFields?: MlEntityField[]): MlAnomaliesTableRecord | undefined;

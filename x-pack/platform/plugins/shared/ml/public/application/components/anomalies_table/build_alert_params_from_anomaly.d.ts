import type { MlAnomaliesTableRecord } from '@kbn/ml-anomaly-utils';
import type { MlAnomalyDetectionAlertParams } from '@kbn/ml-common-types/alerts';
/**
 * Builds initial alert parameters from an anomaly record.
 * Pre-populates job ID, severity, result type, and KQL filter based on the anomaly's characteristics.
 */
export declare function buildAlertParamsFromAnomaly(anomaly: MlAnomaliesTableRecord): Partial<MlAnomalyDetectionAlertParams>;

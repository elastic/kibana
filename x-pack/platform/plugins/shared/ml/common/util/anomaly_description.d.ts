import { type MlAnomaliesTableRecordExtended } from '@kbn/ml-anomaly-utils';
export declare function getAnomalyDescription(anomaly: MlAnomaliesTableRecordExtended, options?: {
    breakAutoLinkifyFieldName: boolean;
}): {
    anomalyDescription: string;
    mvDescription: string | undefined;
};

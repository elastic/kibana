import type { DataStreamType, QualityIndicators } from '../types';
import type { Integration } from './integration';
import type { DataStreamStatType } from './types';
interface QualityStat {
    percentage: number;
    count: number;
}
export declare class DataStreamStat {
    rawName: string;
    type: DataStreamType;
    name: DataStreamStatType['name'];
    namespace: string;
    title?: string;
    size?: DataStreamStatType['size'];
    sizeBytes?: DataStreamStatType['sizeBytes'];
    lastActivity?: DataStreamStatType['lastActivity'];
    userPrivileges?: DataStreamStatType['userPrivileges'];
    totalDocs?: DataStreamStatType['totalDocs'];
    integration?: Integration;
    quality: QualityIndicators;
    docsInTimeRange?: number;
    degradedDocs: QualityStat;
    failedDocs: QualityStat;
    hasFailureStore?: DataStreamStatType['hasFailureStore'];
    defaultRetentionPeriod?: DataStreamStatType['defaultRetentionPeriod'];
    customRetentionPeriod?: DataStreamStatType['customRetentionPeriod'];
    private constructor();
    static create(dataStreamStat: DataStreamStatType): DataStreamStat;
    static fromQualityStats({ datasetName, degradedDocStat, failedDocStat, datasetIntegrationMap, totalDocs, hasFailureStore, }: {
        datasetName: string;
        degradedDocStat: QualityStat;
        failedDocStat: QualityStat;
        datasetIntegrationMap: Record<string, {
            integration: Integration;
            title: string;
        }>;
        totalDocs: number;
        hasFailureStore?: boolean;
    }): DataStreamStat;
    static calculateFilteredSize({ sizeBytes, totalDocs, docsInTimeRange }: DataStreamStat): number;
}
export {};

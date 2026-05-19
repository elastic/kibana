import type { IScopedClusterClient } from '@kbn/core/server';
import { type InfluencersFilterQuery, type MlEntityField } from '@kbn/ml-anomaly-utils';
import type { SeverityThreshold } from '@kbn/ml-server-schemas/embeddables/anomaly_charts';
import type { CriteriaField } from '@kbn/ml-anomaly-utils/types';
import type { RecordsForCriteria, ChartPoint, ExplorerChartsData } from '@kbn/ml-common-types/results';
import type { MlClient } from '../../lib/ml_client';
export declare function chartLimits(data?: ChartPoint[]): {
    max: number;
    min: number;
};
export interface ChartRange {
    min: number;
    max: number;
}
export declare function getDefaultChartsData(): ExplorerChartsData;
export declare function anomalyChartsDataProvider(mlClient: MlClient, client: IScopedClusterClient): {
    getAnomalyChartsData: (options: {
        jobIds: string[];
        influencers: MlEntityField[];
        threshold: SeverityThreshold[];
        earliestMs: number;
        latestMs: number;
        maxResults: number;
        influencersFilterQuery?: InfluencersFilterQuery;
        numberOfPoints: number;
        timeBounds: {
            min?: number;
            max?: number;
        };
    }) => Promise<ExplorerChartsData | undefined>;
    getRecordsForCriteria: (jobIds: string[], criteriaFields: CriteriaField[], threshold: number, earliestMs: number | null, latestMs: number | null, interval: string, functionDescription?: string) => Promise<RecordsForCriteria>;
};

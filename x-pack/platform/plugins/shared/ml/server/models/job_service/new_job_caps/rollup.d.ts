import type { estypes } from '@elastic/elasticsearch';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import type { RollupFields } from '@kbn/ml-anomaly-utils';
export interface RollupJob {
    job_id: string;
    rollup_index: string;
    index_pattern: string;
    fields: RollupFields;
}
export declare function rollupServiceProvider(indexPattern: string, { asCurrentUser }: IScopedClusterClient, dataViewsService: DataViewsService): Promise<{
    getRollupJobs: () => Promise<estypes.RollupGetRollupCapsRollupCapabilitySummary[] | null>;
    getIndexPattern: () => string;
}>;

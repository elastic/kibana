import type { estypes } from '@elastic/elasticsearch';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import type { DatafeedStats } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed_stats';
import type { MlClient } from '../../lib/ml_client';
export interface MlDatafeedsResponse {
    datafeeds: Datafeed[];
    count: number;
}
export interface MlDatafeedsStatsResponse {
    datafeeds: DatafeedStats[];
    count: number;
}
export interface Results {
    [id: string]: {
        started?: estypes.MlStartDatafeedResponse['started'];
        stopped?: estypes.MlStopDatafeedResponse['stopped'];
        error?: any;
    };
}
export type DatafeedsService = ReturnType<typeof datafeedsProvider>;
export declare function datafeedsProvider(client: IScopedClusterClient, mlClient: MlClient): {
    forceStartDatafeeds: (datafeedIds: string[], start?: number, end?: number) => Promise<import("./error_utils").Results | Results>;
    stopDatafeeds: (datafeedIds: string[], closeJobs?: boolean) => Promise<import("./error_utils").Results | Results>;
    forceDeleteDatafeed: (datafeedId: string) => Promise<estypes.AcknowledgedResponseBase>;
    getDatafeedIdsByJobId: () => Promise<{
        [id: string]: string;
    }>;
    getJobIdsByDatafeedId: () => Promise<{
        [id: string]: string;
    }>;
    getDatafeedByJobId: {
        (jobId: string[], excludeGenerated?: boolean): Promise<Datafeed[] | undefined>;
        (jobId: string, excludeGenerated?: boolean): Promise<Datafeed | undefined>;
    };
};

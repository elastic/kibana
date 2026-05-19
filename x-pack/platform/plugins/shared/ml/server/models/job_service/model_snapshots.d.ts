import type { IScopedClusterClient } from '@kbn/core/server';
import type { ModelSnapshot } from '@kbn/ml-common-types/anomaly_detection_jobs/model_snapshot';
import type { MlClient } from '../../lib/ml_client';
export interface ModelSnapshotsResponse {
    count: number;
    model_snapshots: ModelSnapshot[];
}
export interface RevertModelSnapshotResponse {
    model: ModelSnapshot;
}
export declare function modelSnapshotProvider(client: IScopedClusterClient, mlClient: MlClient): {
    revertModelSnapshot: (jobId: string, snapshotId: string, replay: boolean, end?: number, deleteInterveningResults?: boolean, calendarEvents?: Array<{
        start: number;
        end: number;
        description: string;
    }>) => Promise<{
        success: boolean;
    }>;
};

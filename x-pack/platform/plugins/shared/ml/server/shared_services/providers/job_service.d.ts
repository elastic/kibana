import type { KibanaRequest, SavedObjectsClientContract } from '@kbn/core/server';
import type { GetGuards } from '../shared_services';
import { jobServiceProvider } from '../../models/job_service';
type OrigJobServiceProvider = ReturnType<typeof jobServiceProvider>;
export interface JobServiceProvider {
    jobServiceProvider(request: KibanaRequest, savedObjectsClient: SavedObjectsClientContract): {
        jobsSummary: OrigJobServiceProvider['jobsSummary'];
        forceStartDatafeeds: OrigJobServiceProvider['forceStartDatafeeds'];
        stopDatafeeds: OrigJobServiceProvider['stopDatafeeds'];
    };
}
export declare function getJobServiceProvider(getGuards: GetGuards): JobServiceProvider;
export {};

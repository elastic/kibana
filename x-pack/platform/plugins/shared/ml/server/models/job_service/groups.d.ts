import type { UpdateGroupsRequest } from '@kbn/ml-common-types/job_service';
import type { Group } from '@kbn/ml-common-types/groups';
import type { MlClient } from '../../lib/ml_client';
export interface Results {
    [id: string]: {
        success: boolean;
        error?: any;
    };
}
export declare function groupsProvider(mlClient: MlClient): {
    getAllGroups: () => Promise<Group[]>;
    updateGroups: (jobs: UpdateGroupsRequest["jobs"]) => Promise<Results>;
};

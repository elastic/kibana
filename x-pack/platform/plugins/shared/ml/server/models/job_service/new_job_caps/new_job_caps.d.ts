import type { IScopedClusterClient } from '@kbn/core/server';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import { type NewJobCapsResponse } from '@kbn/ml-anomaly-utils';
export declare function newJobCapsProvider(client: IScopedClusterClient): {
    newJobCaps: (indexPattern: string, isRollup: boolean | undefined, dataViewsService: DataViewsService) => Promise<NewJobCapsResponse>;
};

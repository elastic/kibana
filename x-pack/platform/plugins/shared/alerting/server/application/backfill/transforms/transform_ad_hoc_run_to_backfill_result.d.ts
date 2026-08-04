import type { SavedObject, SavedObjectBulkResult, SavedObjectsBulkCreateObject } from '@kbn/core/server';
import type { AdHocRun, AdHocRunSO } from '../../../data/ad_hoc_run/types';
import type { ScheduleBackfillResult } from '../methods/schedule/types';
interface TransformAdHocRunToBackfillResultOpts {
    adHocRunSO: SavedObjectBulkResult<AdHocRunSO>;
    isSystemAction: (connectorId: string) => boolean;
    originalSO?: SavedObjectsBulkCreateObject<AdHocRunSO>;
}
export declare const transformAdHocRunToBackfillResult: ({ adHocRunSO, isSystemAction, originalSO, }: TransformAdHocRunToBackfillResultOpts) => ScheduleBackfillResult;
export declare const transformAdHocRunToAdHocRunData: ({ adHocRunSO, isSystemAction, originalSO, }: {
    adHocRunSO: SavedObject<AdHocRunSO>;
    isSystemAction: (connectorId: string) => boolean;
    originalSO?: SavedObjectsBulkCreateObject<AdHocRunSO>;
}) => AdHocRun;
export {};

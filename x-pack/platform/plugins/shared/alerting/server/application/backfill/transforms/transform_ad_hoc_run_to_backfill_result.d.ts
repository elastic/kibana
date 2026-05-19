import type { SavedObject, SavedObjectsBulkCreateObject } from '@kbn/core/server';
import type { AdHocRun, AdHocRunSO } from '../../../data/ad_hoc_run/types';
import type { ScheduleBackfillResult } from '../methods/schedule/types';
interface TransformAdHocRunToBackfillResultOpts {
    adHocRunSO: SavedObject<AdHocRunSO>;
    isSystemAction: (connectorId: string) => boolean;
    originalSO?: SavedObjectsBulkCreateObject<AdHocRunSO>;
    omitGeneratedActionValues?: boolean;
}
export declare const transformAdHocRunToBackfillResult: ({ adHocRunSO, isSystemAction, originalSO, omitGeneratedActionValues, }: TransformAdHocRunToBackfillResultOpts) => ScheduleBackfillResult;
export declare const transformAdHocRunToAdHocRunData: ({ adHocRunSO, isSystemAction, originalSO, omitGeneratedActionValues, }: TransformAdHocRunToBackfillResultOpts) => AdHocRun;
export {};

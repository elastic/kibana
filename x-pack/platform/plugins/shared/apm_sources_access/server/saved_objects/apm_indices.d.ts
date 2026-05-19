import type { SavedObjectsType } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { APMIndices } from '../../common/config_schema';
export declare const APM_INDEX_SETTINGS_SAVED_OBJECT_TYPE = "apm-indices";
export declare const APM_INDEX_SETTINGS_SAVED_OBJECT_ID = "apm-indices";
export interface APMIndicesSavedObjectBody {
    apmIndices?: {
        error?: string;
        onboarding?: string;
        span?: string;
        transaction?: string;
        metric?: string;
        sourcemap?: string;
    };
    isSpaceAware?: boolean;
}
export declare const apmIndicesSavedObjectDefinition: SavedObjectsType;
export declare function saveApmIndices(savedObjectsClient: SavedObjectsClientContract, apmIndices: Partial<APMIndices>): Promise<import("@kbn/core/server").SavedObject<APMIndicesSavedObjectBody>>;
export declare function getApmIndicesSavedObject(savedObjectsClient: SavedObjectsClientContract): Promise<{
    error?: string;
    onboarding?: string;
    span?: string;
    transaction?: string;
    metric?: string;
    sourcemap?: string;
} | undefined>;

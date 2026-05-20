import type { Logger, SavedObjectsClientContract, SavedObjectsServiceSetup } from '@kbn/core/server';
export declare const CLOUD_DATA_SAVED_OBJECT_TYPE: "cloud";
export declare function setupSavedObjects(savedObjects: SavedObjectsServiceSetup, logger: Logger): void;
export declare function getOnboardingToken(savedObjectsClient: SavedObjectsClientContract): Promise<string | null>;

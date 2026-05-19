import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
export declare function cleanupStaleUserConnectorTokens(unsecuredSavedObjectsClient: SavedObjectsClientContract, logger: Logger): Promise<number>;

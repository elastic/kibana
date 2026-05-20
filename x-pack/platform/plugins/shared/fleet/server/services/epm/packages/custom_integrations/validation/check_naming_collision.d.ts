import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
export declare const checkForNamingCollision: (savedObjectsClient: SavedObjectsClientContract, integrationName: string) => Promise<void>;
export declare const checkForRegistryNamingCollision: (savedObjectsClient: SavedObjectsClientContract, integrationName: string) => Promise<void>;
export declare const checkForInstallationNamingCollision: (savedObjectsClient: SavedObjectsClientContract, integrationName: string) => Promise<void>;
export declare class NamingCollisionError extends Error {
    constructor(message?: string);
}

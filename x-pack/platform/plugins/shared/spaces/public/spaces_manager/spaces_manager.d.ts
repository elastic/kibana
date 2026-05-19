import type { Observable } from 'rxjs';
import type { HttpSetup } from '@kbn/core/public';
import type { SavedObjectsCollectMultiNamespaceReferencesResponse } from '@kbn/core-saved-objects-api-server';
import type { LegacyUrlAliasTarget } from '@kbn/core-saved-objects-common';
import type { Role } from '@kbn/security-plugin-types-common';
import { type GetAllSpacesOptions, type GetSpaceResult, type Space } from '../../common';
import type { CopySavedObjectsToSpaceResponse } from '../copy_saved_objects_to_space/types';
import type { SpaceContentTypeSummaryItem } from '../types';
interface SavedObjectTarget {
    type: string;
    id: string;
}
export declare class SpacesManager {
    private readonly http;
    private activeSpace$;
    private readonly serverBasePath;
    private readonly _onActiveSpaceChange$;
    constructor(http: HttpSetup);
    get onActiveSpaceChange$(): Observable<Space>;
    getSpaces(options?: GetAllSpacesOptions): Promise<GetSpaceResult[]>;
    getSpace(id: string): Promise<Space>;
    getActiveSpace({ forceRefresh }?: {
        forceRefresh?: boolean | undefined;
    }): Promise<Space>;
    createSpace(space: Space): Promise<void>;
    updateSpace(space: Space): Promise<void>;
    deleteSpace(space: Space): Promise<void>;
    disableLegacyUrlAliases(aliases: LegacyUrlAliasTarget[]): Promise<void>;
    copySavedObjects(objects: SavedObjectTarget[], spaces: string[], includeReferences: boolean, createNewCopies: boolean, overwrite: boolean): Promise<CopySavedObjectsToSpaceResponse>;
    resolveCopySavedObjectsErrors(objects: SavedObjectTarget[], retries: unknown, includeReferences: boolean, createNewCopies: boolean): Promise<CopySavedObjectsToSpaceResponse>;
    getShareSavedObjectPermissions(type: string): Promise<{
        shareToAllSpaces: boolean;
    }>;
    getShareableReferences(objects: SavedObjectTarget[]): Promise<SavedObjectsCollectMultiNamespaceReferencesResponse>;
    updateSavedObjectsSpaces(objects: SavedObjectTarget[], spacesToAdd: string[], spacesToRemove: string[]): Promise<void>;
    redirectToSpaceSelector(): void;
    private refreshActiveSpace;
    private isAnonymousPath;
    getContentForSpace(id: string): Promise<{
        summary: SpaceContentTypeSummaryItem[];
        total: number;
    }>;
    getRolesForSpace(id: string): Promise<Role[]>;
    getPersistedFeatureVisibility(id: string): Promise<{
        featureVisibility: {
            disabledFeatures: string[];
        };
    }>;
}
export {};

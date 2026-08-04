import type { KibanaRequest, SavedObjectsClient } from '@kbn/core/server';
import type { LegacyUrlAliasTarget } from '@kbn/core-saved-objects-common';
import type { ISavedObjectsSecurityExtension, ISavedObjectTypeRegistry } from '@kbn/core-saved-objects-server';
import type { AuditLogger, AuthorizationServiceSetup } from '@kbn/security-plugin-types-server';
import type { GetAllSpacesOptions, GetSpaceResult, ISpacesClient, Space } from '@kbn/spaces-plugin/server';
/** @internal */
export declare const LEGACY_URL_ALIAS_TYPE = "legacy-url-alias";
export declare class SecureSpacesClientWrapper implements ISpacesClient {
    private readonly spacesClient;
    private readonly request;
    private readonly authorization;
    private readonly auditLogger;
    private readonly errors;
    private readonly securityExtension;
    private readonly getTypeRegistry;
    private readonly useRbac;
    constructor(spacesClient: ISpacesClient, request: KibanaRequest, authorization: AuthorizationServiceSetup, auditLogger: AuditLogger, errors: SavedObjectsClient['errors'], securityExtension: ISavedObjectsSecurityExtension | undefined, getTypeRegistry: () => Promise<ISavedObjectTypeRegistry>);
    getAll({ purpose, includeAuthorizedPurposes, }?: GetAllSpacesOptions): Promise<GetSpaceResult[]>;
    get(id: string): Promise<Space>;
    getPersistedFeatureVisibility(id: string): Promise<string[]>;
    create(space: Space): Promise<Space>;
    update(id: string, space: Space): Promise<Space>;
    createSavedObjectFinder(id: string): import("@kbn/core/server").ISavedObjectsPointInTimeFinder<unknown, unknown>;
    delete(id: string): Promise<void>;
    disableLegacyUrlAliases(aliases: LegacyUrlAliasTarget[]): Promise<void>;
    private ensureAuthorizedGlobally;
    private ensureAuthorizedAtSpace;
    private filterUnauthorizedSpaceResults;
}
/** @internal This is only exported for testing purposes. */
export declare function getAliasId({ targetSpace, targetType, sourceId }: LegacyUrlAliasTarget): string;

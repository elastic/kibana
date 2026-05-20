import type { IBasePath, KibanaRequest } from '@kbn/core/server';
import type { Space } from '../../common';
import type { ISpacesClient, SpacesClientServiceStart } from '../spaces_client';
/**
 * The Spaces service setup contract.
 */
export interface SpacesServiceSetup {
    /**
     * Retrieves the space id associated with the provided request.
     * @param request the request.
     */
    getSpaceId(request: KibanaRequest): string;
    /**
     * Converts the provided space id into the corresponding Saved Objects `namespace` id.
     * @param spaceId the space id to convert.
     */
    spaceIdToNamespace(spaceId: string): string | undefined;
    /**
     * Converts the provided namespace into the corresponding space id.
     * @param namespace the namespace to convert.
     */
    namespaceToSpaceId(namespace: string | undefined): string;
}
/**
 * The Spaces service start contract.
 */
export interface SpacesServiceStart {
    /**
     * Creates a scoped instance of the SpacesClient.
     * @param request the request.
     */
    createSpacesClient: (request: KibanaRequest) => ISpacesClient;
    /**
     * Retrieves the space id associated with the provided request.
     * @param request the request.
     */
    getSpaceId(request: KibanaRequest): string;
    /**
     * Indicates if the provided request is executing within the context of the `default` space.
     * @param request the request.
     */
    isInDefaultSpace(request: KibanaRequest): boolean;
    /**
     * Retrieves the Space associated with the provided request.
     * @param request the request.
     */
    getActiveSpace(request: KibanaRequest): Promise<Space>;
    /**
     * Converts the provided space id into the corresponding Saved Objects `namespace` id.
     * @param spaceId the space id to convert.
     */
    spaceIdToNamespace(spaceId: string): string | undefined;
    /**
     * Converts the provided namespace into the corresponding space id.
     * @param namespace the namespace to convert.
     */
    namespaceToSpaceId(namespace: string | undefined): string;
}
interface SpacesServiceSetupDeps {
    basePath: IBasePath;
}
interface SpacesServiceStartDeps {
    basePath: IBasePath;
    spacesClientService: SpacesClientServiceStart;
}
/**
 * Service for interacting with spaces.
 */
export declare class SpacesService {
    setup({ basePath }: SpacesServiceSetupDeps): SpacesServiceSetup;
    start({ basePath, spacesClientService }: SpacesServiceStartDeps): SpacesServiceStart;
    stop(): void;
    private getSpaceId;
}
export {};

import type { ISavedObjectsSpacesExtension } from '@kbn/core-saved-objects-server';
import type { ISpacesClient } from '../spaces_client';
interface Params {
    activeSpaceId: string;
    spacesClient: ISpacesClient;
}
export declare class SavedObjectsSpacesExtension implements ISavedObjectsSpacesExtension {
    private readonly activeSpaceId;
    private readonly spacesClient;
    constructor({ activeSpaceId, spacesClient }: Params);
    getCurrentNamespace(namespace: string | undefined): string | undefined;
    getSearchableNamespaces(namespaces: string[] | undefined): Promise<string[]>;
    asScopedToNamespace(namespace: string): SavedObjectsSpacesExtension;
}
export {};

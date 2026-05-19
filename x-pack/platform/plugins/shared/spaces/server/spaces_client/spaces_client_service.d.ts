import type { Observable } from 'rxjs';
import type { BuildFlavor } from '@kbn/config/src/types';
import type { CoreStart, ISavedObjectsRepository, KibanaRequest, SavedObjectsServiceStart } from '@kbn/core/server';
import type { CPSServerStart } from '@kbn/cps/server';
import type { FeaturesPluginStart } from '@kbn/features-plugin/server';
import type { ISpacesClient } from './spaces_client';
import type { ConfigType } from '../config';
/**
 * For consumption by the security plugin only.
 * @internal
 */
export type SpacesClientWrapper = (request: KibanaRequest, baseClient: ISpacesClient) => ISpacesClient;
/**
 * For consumption by the security plugin only.
 * @internal
 */
export type SpacesClientRepositoryFactory = (request: KibanaRequest, savedObjectsStart: SavedObjectsServiceStart) => ISavedObjectsRepository;
export interface SpacesClientServiceSetup {
    /**
     * Sets the factory that should be used to create the Saved Objects Repository
     * whenever a new instance of the SpacesClient is created. By default, a repository
     * scoped to the current user will be created.
     */
    setClientRepositoryFactory: (factory: SpacesClientRepositoryFactory) => void;
    /**
     * Sets the client wrapper that should be used to optionally "wrap" each instance of the SpacesClient.
     * By default, an unwrapped client will be created.
     *
     * Unlike the SavedObjectsClientWrappers, this service only supports a single wrapper. It is not possible
     * to register multiple wrappers at this time.
     */
    registerClientWrapper: (wrapper: SpacesClientWrapper) => void;
}
export interface SpacesClientServiceStart {
    /**
     * Creates an instance of the SpacesClient scoped to the provided request.
     */
    createSpacesClient: (request: KibanaRequest) => ISpacesClient;
}
interface SetupDeps {
    config$: Observable<ConfigType>;
}
export declare class SpacesClientService {
    private readonly debugLogger;
    private readonly buildFlavour;
    private repositoryFactory?;
    private config?;
    private clientWrapper?;
    constructor(debugLogger: (message: string) => void, buildFlavour: BuildFlavor);
    setup({ config$ }: SetupDeps): SpacesClientServiceSetup;
    start(coreStart: CoreStart, features: FeaturesPluginStart, cps: CPSServerStart | undefined): SpacesClientServiceStart;
}
export {};

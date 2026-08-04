import type { Observable } from 'rxjs';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { SpacesClientRepositoryFactory, SpacesClientWrapper } from './spaces_client';
import type { SpacesServiceSetup, SpacesServiceStart } from './spaces_service';
import type { SpacesPluginSetupDeps, SpacesPluginStartDeps } from './types';
/**
 * Setup contract for the Spaces plugin.
 */
export interface SpacesPluginSetupApi {
    /**
     * Service for interacting with spaces.
     */
    spacesService: SpacesServiceSetup;
    /**
     * Registries exposed for the security plugin to transparently provide authorization and audit logging.
     * @internal
     */
    spacesClient: {
        /**
         * Sets the client repository factory.
         * @internal
         */
        setClientRepositoryFactory: (factory: SpacesClientRepositoryFactory) => void;
        /**
         * Registers a client wrapper.
         * @internal
         */
        registerClientWrapper: (wrapper: SpacesClientWrapper) => void;
    };
    /**
     * Determines whether Kibana supports multiple spaces or only the default space.
     *
     * When `xpack.spaces.maxSpaces` is set to 1 Kibana only supports the default space and any spaces related UI can safely be hidden.
     */
    hasOnlyDefaultSpace$: Observable<boolean>;
}
/**
 * Start contract for the Spaces plugin.
 */
export interface SpacesPluginStartApi {
    /** Service for interacting with spaces. */
    spacesService: SpacesServiceStart;
    /**
     * Determines whether Kibana supports multiple spaces or only the default space.
     *
     * When `xpack.spaces.maxSpaces` is set to 1 Kibana only supports the default space and any spaces related UI can safely be hidden.
     */
    hasOnlyDefaultSpace$: Observable<boolean>;
}
export declare class SpacesPlugin implements Plugin<SpacesPluginSetupApi, SpacesPluginStartApi, SpacesPluginSetupDeps, SpacesPluginStartDeps> {
    private readonly initializerContext;
    private readonly config$;
    private readonly log;
    private readonly spacesLicenseService;
    private readonly spacesClientService;
    private readonly spacesService;
    private readonly hasOnlyDefaultSpace$;
    private spacesServiceStart?;
    private defaultSpaceService?;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup<SpacesPluginStartDeps>, plugins: SpacesPluginSetupDeps): SpacesPluginSetupApi;
    start(core: CoreStart, plugins: SpacesPluginStartDeps): {
        spacesService: SpacesServiceStart;
        hasOnlyDefaultSpace$: Observable<boolean>;
    };
    stop(): void;
}

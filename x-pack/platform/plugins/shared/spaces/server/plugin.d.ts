import type { Observable } from 'rxjs';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { CPSServerSetup, CPSServerStart } from '@kbn/cps/server';
import type { FeaturesPluginSetup, FeaturesPluginStart } from '@kbn/features-plugin/server';
import type { HomeServerPluginSetup } from '@kbn/home-plugin/server';
import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { SpacesClientRepositoryFactory, SpacesClientWrapper } from './spaces_client';
import type { SpacesServiceSetup, SpacesServiceStart } from './spaces_service';
export interface PluginsSetup {
    features: FeaturesPluginSetup;
    licensing: LicensingPluginSetup;
    usageCollection?: UsageCollectionSetup;
    home?: HomeServerPluginSetup;
    cloud?: CloudSetup;
    cps?: CPSServerSetup;
}
export interface PluginsStart {
    features: FeaturesPluginStart;
    cps?: CPSServerStart;
}
/**
 * Setup contract for the Spaces plugin.
 */
export interface SpacesPluginSetup {
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
export interface SpacesPluginStart {
    /** Service for interacting with spaces. */
    spacesService: SpacesServiceStart;
    /**
     * Determines whether Kibana supports multiple spaces or only the default space.
     *
     * When `xpack.spaces.maxSpaces` is set to 1 Kibana only supports the default space and any spaces related UI can safely be hidden.
     */
    hasOnlyDefaultSpace$: Observable<boolean>;
}
export declare class SpacesPlugin implements Plugin<SpacesPluginSetup, SpacesPluginStart, PluginsSetup, PluginsStart> {
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
    setup(core: CoreSetup<PluginsStart>, plugins: PluginsSetup): SpacesPluginSetup;
    start(core: CoreStart, plugins: PluginsStart): {
        spacesService: SpacesServiceStart;
        hasOnlyDefaultSpace$: Observable<boolean>;
    };
    stop(): void;
}

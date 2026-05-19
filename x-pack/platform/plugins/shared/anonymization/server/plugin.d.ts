import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginSetup, EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { AnonymizationPluginSetup, AnonymizationPluginStart, AnonymizationProfileInitializer } from './types';
export interface AnonymizationSetupDeps {
    encryptedSavedObjects: EncryptedSavedObjectsPluginSetup;
    features: FeaturesPluginSetup;
}
export interface AnonymizationStartDeps {
    encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
}
export declare class AnonymizationPlugin implements Plugin<AnonymizationPluginSetup, AnonymizationPluginStart, AnonymizationSetupDeps, AnonymizationStartDeps> {
    private readonly logger;
    private policyService;
    private readonly profileInitializers;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup<AnonymizationStartDeps>, deps: AnonymizationSetupDeps): {
        isEnabled: () => boolean;
        registerProfileInitializer: (initializer: AnonymizationProfileInitializer) => void;
    };
    start(core: CoreStart, deps: AnonymizationStartDeps): AnonymizationPluginStart;
    stop(): void;
}

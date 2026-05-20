import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/server';
import type { SavedObjectTaggingStart } from './types';
interface SetupDeps {
    features: FeaturesPluginSetup;
    usageCollection?: UsageCollectionSetup;
    security?: SecurityPluginSetup;
}
interface StartDeps {
    security?: SecurityPluginStart;
}
export declare class SavedObjectTaggingPlugin implements Plugin<{}, SavedObjectTaggingStart, SetupDeps, StartDeps> {
    setup({ savedObjects, http, getStartServices }: CoreSetup<StartDeps, SavedObjectTaggingStart>, { features, usageCollection, security }: SetupDeps): {};
    start(core: CoreStart, { security }: StartDeps): SavedObjectTaggingStart;
}
export {};

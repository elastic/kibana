import type { CoreStart } from '@kbn/core/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
/**
 * Creates initializeJobs function which is used to check whether
 * ml job saved objects exist and creates them if needed
 *
 * @param core: CoreStart
 */
export declare function jobSavedObjectsInitializationFactory(core: CoreStart, security: SecurityPluginSetup | undefined, spacesEnabled: boolean): {
    initializeJobs: () => Promise<void>;
};

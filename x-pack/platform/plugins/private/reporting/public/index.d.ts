import type { PluginInitializerContext } from '@kbn/core/public';
import type { ReportingPublicComponents } from '@kbn/reporting-public/share';
import type { ReportingPublicPlugin } from './plugin';
/**
 * Setup contract for the Reporting plugin.
 */
export interface ReportingSetup {
    /**
     * A set of React components for displaying a Reporting share menu in an application
     */
    components: ReportingPublicComponents;
}
/**
 * Start contract for the Reporting plugin.
 */
export type ReportingStart = ReportingSetup;
/**
 * @internal
 *
 * @param {PluginInitializerContext} initializerContext
 * @returns {ReportingPublicPlugin}
 */
export declare function plugin(initializerContext: PluginInitializerContext): ReportingPublicPlugin;

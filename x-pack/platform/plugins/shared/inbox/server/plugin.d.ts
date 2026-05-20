import { type CoreSetup, type CoreStart, type KibanaRequest, type Plugin, type PluginInitializerContext } from '@kbn/core/server';
import type { InboxConfig } from './config';
import type { InboxPluginSetup, InboxPluginStart, InboxSetupDependencies, InboxStartDependencies } from './types';
/**
 * Resolves the active space id for a request. The routes accept this as a
 * dependency so that (a) we never silently default to `'default'` and leak
 * cross-space rows, and (b) tests can inject a fixed resolver without
 * pulling in the full spaces plugin.
 */
export type InboxSpaceIdResolver = (request: KibanaRequest) => string;
export declare class InboxPlugin implements Plugin<InboxPluginSetup, InboxPluginStart, InboxSetupDependencies, InboxStartDependencies> {
    private readonly logger;
    private readonly config;
    constructor(context: PluginInitializerContext<InboxConfig>);
    setup(coreSetup: CoreSetup<InboxStartDependencies, InboxPluginStart>, { features }: InboxSetupDependencies): InboxPluginSetup;
    private spaces?;
    private getSpaceId;
    start(_core: CoreStart, plugins: InboxStartDependencies): InboxPluginStart;
    stop(): void;
}

import type { CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import type { StreamsPublicConfig } from '../common/config';
import type { StreamsPluginClass, StreamsPluginSetup, StreamsPluginSetupDependencies, StreamsPluginStart, StreamsPluginStartDependencies } from './types';
export declare class Plugin implements StreamsPluginClass {
    config: StreamsPublicConfig;
    logger: Logger;
    private repositoryClient;
    private isServerless;
    constructor(context: PluginInitializerContext<{}>);
    setup(core: CoreSetup, pluginSetup: StreamsPluginSetupDependencies): StreamsPluginSetup;
    start(core: CoreStart, pluginsStart: StreamsPluginStartDependencies): StreamsPluginStart;
    stop(): void;
}

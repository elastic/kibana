import type { CoreSetup, CoreStart, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { StreamsConfig } from '../common/config';
import type { StreamsPluginSetupDependencies, StreamsPluginStartDependencies, StreamsServer } from './types';
export interface StreamsPluginSetup {
}
export interface StreamsPluginStart {
}
export declare class StreamsPlugin implements Plugin<StreamsPluginSetup, StreamsPluginStart, StreamsPluginSetupDependencies, StreamsPluginStartDependencies> {
    config: StreamsConfig;
    logger: Logger;
    server?: StreamsServer;
    private isDev;
    private ebtTelemetryService;
    private statsTelemetryService;
    private processorSuggestionsService;
    private patternExtractionService?;
    constructor(context: PluginInitializerContext<StreamsConfig>);
    setup(core: CoreSetup<StreamsPluginStartDependencies>, plugins: StreamsPluginSetupDependencies): StreamsPluginSetup;
    start(core: CoreStart, plugins: StreamsPluginStartDependencies): StreamsPluginStart;
    stop(): Promise<void>;
}

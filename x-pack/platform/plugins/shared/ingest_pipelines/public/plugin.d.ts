import type { CoreStart, CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { SetupDependencies, StartDependencies, Config, IngestPipelinesPluginStart } from './types';
export declare class IngestPipelinesPlugin implements Plugin<void, void, SetupDependencies, StartDependencies> {
    private license;
    private licensingSubscription?;
    private readonly config;
    constructor(initializerContext: PluginInitializerContext<Config>);
    setup(coreSetup: CoreSetup<StartDependencies>, plugins: SetupDependencies): void;
    start(core: CoreStart, startDependencies: StartDependencies): IngestPipelinesPluginStart;
    stop(): void;
}

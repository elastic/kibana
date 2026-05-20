import type { CoreStart } from '@kbn/core/public';
import { type CoreSetup, type Plugin, type PluginInitializerContext } from '@kbn/core/public';
import type { IngestHubSetup, IngestHubStart, IngestHubStartDependencies } from './types';
export declare class IngestHubPlugin implements Plugin<IngestHubSetup, IngestHubStart, object, IngestHubStartDependencies> {
    private readonly context;
    private readonly ingestFlows;
    constructor(context: PluginInitializerContext);
    setup(coreSetup: CoreSetup<IngestHubStartDependencies>): IngestHubSetup;
    start(coreStart: CoreStart, deps: IngestHubStartDependencies): IngestHubStart;
}

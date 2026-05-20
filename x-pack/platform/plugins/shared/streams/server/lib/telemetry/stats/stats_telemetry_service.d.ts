import type { CoreSetup, Logger } from '@kbn/core/server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { StreamsPluginStartDependencies } from '../../../types';
/**
 * Service for collecting Streams usage statistics for telemetry
 */
export declare class StatsTelemetryService {
    constructor();
    setup(core: CoreSetup<StreamsPluginStartDependencies>, logger: Logger, usageCollection?: UsageCollectionSetup): void;
    private getUsageReader;
}

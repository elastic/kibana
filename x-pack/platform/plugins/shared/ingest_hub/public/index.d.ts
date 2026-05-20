import type { PluginInitializer } from '@kbn/core/public';
import type { IngestHubSetup, IngestHubStart, IngestHubStartDependencies } from './types';
export type { IngestHubSetup, IngestHubStart, IngestFlow } from './types';
export declare const plugin: PluginInitializer<IngestHubSetup, IngestHubStart, object, IngestHubStartDependencies>;

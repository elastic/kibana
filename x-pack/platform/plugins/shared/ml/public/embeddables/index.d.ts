import type { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import type { MlCoreSetup } from '../plugin';
export * from './constants';
export type * from './types';
export declare function registerEmbeddables(embeddable: EmbeddableSetup, core: MlCoreSetup, usageCollection?: UsageCollectionSetup): void;

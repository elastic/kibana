import type { FeatureWithFilter } from '@kbn/streams-schema';
import type { Condition } from '@kbn/streamlang';
export declare function getEntityFilters(features: FeatureWithFilter[], maxFilters: number): Condition[];

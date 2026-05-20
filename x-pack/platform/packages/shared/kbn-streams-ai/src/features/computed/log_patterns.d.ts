import { type LogPatternEsqlEntry } from '@kbn/ai-tools';
import type { ComputedFeatureGenerator } from './types';
export type LogPatternEntry = LogPatternEsqlEntry;
export declare function selectLogPatternsForLlm(patterns: LogPatternEntry[]): LogPatternEntry[];
export declare const logPatternsGenerator: ComputedFeatureGenerator;

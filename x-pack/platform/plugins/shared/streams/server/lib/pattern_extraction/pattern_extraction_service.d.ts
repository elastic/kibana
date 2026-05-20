import type { Logger } from '@kbn/logging';
import type { PatternExtractionWorkerConfig } from '../../../common/config';
import type { GrokExtractionResult, DissectExtractionResult } from './types';
export interface IPatternExtractionService {
    extractGrokPatterns(messages: string[]): Promise<GrokExtractionResult>;
    extractDissectPattern(messages: string[]): Promise<DissectExtractionResult>;
    stop(): Promise<void>;
}
export declare class PatternExtractionService implements IPatternExtractionService {
    private readonly logger;
    private readonly enabled;
    private worker?;
    private readonly config;
    constructor(config: PatternExtractionWorkerConfig, logger: Logger);
    private createWorkerPool;
    private run;
    extractGrokPatterns(messages: string[]): Promise<GrokExtractionResult>;
    extractDissectPattern(messages: string[]): Promise<DissectExtractionResult>;
    stop(): Promise<void>;
}

import type { Logger } from '@kbn/logging';
import type { AnonymizationRegexWorkerTaskPayload } from './types';
import type { AnonymizationWorkerConfig } from '../../config';
import type { DetectedMatch } from './types';
export declare class RegexWorkerService {
    private readonly logger;
    private readonly enabled;
    private worker?;
    private readonly config;
    constructor(config: AnonymizationWorkerConfig, logger: Logger);
    private createWorkerPool;
    /**
     * Execute a task in a worker.  Falls back to synchronous execution when the
     * worker is disabled
     */
    run(payload: AnonymizationRegexWorkerTaskPayload): Promise<DetectedMatch[]>;
    stop(): Promise<void>;
}

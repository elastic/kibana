import type { Logger } from '@kbn/core/server';
import type { BackoffFactory } from './types';
export declare abstract class RetryService {
    protected logger: Logger;
    protected readonly serviceName: string;
    private maxAttempts;
    private readonly backOffStrategy;
    private timer;
    private attempt;
    constructor(logger: Logger, backOffFactory: BackoffFactory, serviceName: string, maxAttempts?: number);
    retryWithBackoff<T>(cb: () => Promise<T>): Promise<T>;
    private shouldRetry;
    protected abstract isRetryableError(error: Error): boolean;
    private delay;
    private stop;
}

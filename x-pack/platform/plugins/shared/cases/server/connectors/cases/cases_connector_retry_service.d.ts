import type { Logger } from '@kbn/core/server';
import type { BackoffFactory } from '@kbn/response-ops-retry-service';
import { RetryService } from '@kbn/response-ops-retry-service';
export declare class CasesConnectorRetryService extends RetryService {
    /**
     * 409 - Conflict
     * 429 - Too Many Requests
     * 503 - ES Unavailable
     *
     * Full list of errors: src/core/packages/saved-objects/server/src/saved_objects_error_helpers.ts
     */
    private readonly RETRY_ERROR_STATUS_CODES;
    constructor(logger: Logger, backOffFactory: BackoffFactory, maxAttempts?: number);
    protected isRetryableError(error: Error): boolean;
}

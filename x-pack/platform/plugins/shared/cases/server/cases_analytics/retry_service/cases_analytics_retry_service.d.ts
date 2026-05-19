import type { Logger } from '@kbn/core/server';
import type { errors as EsErrors } from '@elastic/elasticsearch';
import type { BackoffFactory } from '@kbn/response-ops-retry-service';
import { RetryService } from '@kbn/response-ops-retry-service';
export declare class CasesAnalyticsRetryService extends RetryService {
    constructor(logger: Logger, backOffFactory: BackoffFactory, maxAttempts?: number);
    protected isRetryableError(error: EsErrors.ElasticsearchClientError): boolean;
}

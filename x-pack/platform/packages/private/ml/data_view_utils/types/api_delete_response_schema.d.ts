import type Boom from '@hapi/boom';
import type { EsErrorBody } from '@kbn/ml-error-utils';
/**
 * Interface for data view API response for deletion status
 */
export interface DeleteDataViewApiResponseSchema {
    /**
     * Success
     */
    success: boolean;
    /**
     * Optional error
     */
    error?: EsErrorBody | Boom.Boom;
}

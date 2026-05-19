import type { IScopedClusterClient } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import type { JobValidationMessage } from '../../../common/constants/messages';
import type { validateJobSchema } from '../../routes/schemas/job_validation_schema';
import type { MlClient } from '../../lib/ml_client';
export type ValidateJobPayload = TypeOf<typeof validateJobSchema>;
/**
 * Validates the job configuration after
 * @kbn/config-schema has checked the payload {@link validateJobSchema}.
 */
export declare function validateJob(client: IScopedClusterClient, mlClient: MlClient, payload: ValidateJobPayload, isSecurityDisabled?: boolean): Promise<JobValidationMessage[]>;

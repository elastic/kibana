import type { Observable } from 'rxjs';
import { type MLHttpFetchError } from '@kbn/ml-error-utils';
import type { JobValidator } from '../../job_validator/job_validator';
import type { JobCreator } from '../job_creator';
import type { MlApi } from '../../../../../services/ml_api_service';
export type CalculatePayload = Parameters<MlApi['calculateModelMemoryLimit$']>[0];
export declare const modelMemoryEstimatorProvider: (jobCreator: JobCreator, jobValidator: JobValidator, mlApi: MlApi) => {
    readonly error$: Observable<MLHttpFetchError>;
    readonly updates$: Observable<string>;
    update(payload: CalculatePayload): void;
};
export declare const useModelMemoryEstimator: (jobCreator: JobCreator, jobValidator: JobValidator, jobCreatorUpdate: Function, jobCreatorUpdated: number) => void;

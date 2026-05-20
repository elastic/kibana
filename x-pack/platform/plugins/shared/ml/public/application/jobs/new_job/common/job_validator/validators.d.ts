import type { Observable, Subject } from 'rxjs';
import type { CardinalityModelPlotHigh, CardinalityValidationResult } from '../../../../services/ml_api_service';
import type { JobCreator } from '../job_creator';
import type { BasicValidations } from './job_validator';
export declare enum VALIDATOR_SEVERITY {
    ERROR = 0,
    WARNING = 1
}
export interface CardinalityValidatorError {
    highCardinality: {
        value: number;
        severity: VALIDATOR_SEVERITY;
    };
}
export type CardinalityValidatorResult = CardinalityValidatorError | null;
export type JobExistsResult = {
    jobIdExists: BasicValidations['jobId'];
} | null;
export type GroupsExistResult = {
    groupIdsExist: BasicValidations['groupIds'];
} | null;
export declare function isCardinalityModelPlotHigh(cardinalityValidationResult: CardinalityValidationResult): cardinalityValidationResult is CardinalityModelPlotHigh;
export declare function cardinalityValidator(jobCreator$: Subject<JobCreator>): Observable<CardinalityValidatorResult>;
export declare function jobIdValidator(jobCreator$: Subject<JobCreator>): Observable<JobExistsResult>;
export declare function groupIdsValidator(jobCreator$: Subject<JobCreator>): Observable<GroupsExistResult>;

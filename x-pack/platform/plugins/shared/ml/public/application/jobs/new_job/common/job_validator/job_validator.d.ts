import type { ReactElement } from 'react';
import type { Observable } from 'rxjs';
import type { JobCreatorType } from '../job_creator';
import type { CardinalityValidatorResult, JobExistsResult, GroupsExistResult } from './validators';
export declare const VALIDATION_DELAY_MS = 500;
type AsyncValidatorsResult = Partial<CardinalityValidatorResult & JobExistsResult & GroupsExistResult>;
/**
 * Union of possible validation results.
 */
export type JobValidationResult = BasicValidations & AsyncValidatorsResult;
export interface ValidationSummary {
    basic: boolean;
    advanced: boolean;
}
export interface Validation {
    valid: boolean;
    message?: string | ReactElement;
}
export interface BasicValidations {
    jobId: Validation;
    groupIds: Validation;
    modelMemoryLimit: Validation;
    bucketSpan: Validation;
    duplicateDetectors: Validation;
    query: Validation;
    queryDelay: Validation;
    frequency: Validation;
    scrollSize: Validation;
    categorizerMissingPerPartition: Validation;
    categorizerVaryingPerPartitionField: Validation;
    summaryCountField: Validation;
}
export interface AdvancedValidations {
    categorizationFieldValid: Validation;
}
export declare class JobValidator {
    private _jobCreator;
    private _validationSummary;
    private _lastJobConfig;
    private _lastDatafeedConfig;
    private _validateTimeout;
    private _asyncValidators$;
    private _asyncValidatorsResult$;
    private _basicValidations;
    private _advancedValidations;
    private _validating;
    private _basicValidationResult$;
    private _jobCreatorSubject$;
    /**
     * Observable that combines basic and async validation results.
     */
    validationResult$: Observable<JobValidationResult>;
    constructor(jobCreator: JobCreatorType);
    latestValidationResult: JobValidationResult;
    validate(callback: () => void, forceValidate?: boolean): void;
    private _resetBasicValidations;
    private _runBasicValidation;
    private _runAdvancedValidation;
    private _isOverallBasicValid;
    get validationSummary(): ValidationSummary;
    get bucketSpan(): Validation;
    get summaryCountField(): Validation;
    get duplicateDetectors(): Validation;
    get jobId(): Validation;
    get groupIds(): Validation;
    get modelMemoryLimit(): Validation;
    get query(): Validation;
    get queryDelay(): Validation;
    get frequency(): Validation;
    get scrollSize(): Validation;
    set advancedValid(valid: boolean);
    get validating(): boolean;
    get categorizationField(): boolean;
    set categorizationField(valid: boolean);
    get categorizerMissingPerPartition(): Validation;
    get categorizerVaryingPerPartitionField(): Validation;
    /**
     * Indicates if the Pick Fields step has a valid input
     */
    get isPickFieldsStepValid(): boolean;
    get isModelMemoryEstimationPayloadValid(): boolean;
}
export {};

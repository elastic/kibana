/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReactElement } from 'react';
import { combineLatest, Observable, ReplaySubject, Subject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import {
  basicJobValidation,
  basicDatafeedValidation,
} from '../../../../../../common/util/job_utils';
import { getNewJobLimits } from '../../../../services/ml_server_info';
import { JobCreator, JobCreatorType } from '../job_creator';
import { populateValidationMessages, checkForExistingJobAndGroupIds } from './util';
import { ExistingJobsAndGroups } from '../../../../services/job_service';
import { cardinalityValidator, CardinalityValidatorResult } from './validators';

// delay start of validation to allow the user to make changes
// e.g. if they are typing in a new value, try not to validate
// after every keystroke
const VALIDATION_DELAY_MS = 500;

type AsyncValidatorsResult = Partial<CardinalityValidatorResult>;

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
}

export class JobValidator {
  private _jobCreator: JobCreatorType;
  private _validationSummary: ValidationSummary;
  private _lastJobConfig: string;
  private _lastDatafeedConfig: string;
  private _validateTimeout: ReturnType<typeof setTimeout> | null = null;
  private _asyncValidators$: Array<Observable<AsyncValidatorsResult>> = [];
  private _asyncValidatorsResult$: Observable<AsyncValidatorsResult>;
  private _existingJobsAndGroups: ExistingJobsAndGroups;
  private _basicValidations: BasicValidations = {
    jobId: { valid: true },
    groupIds: { valid: true },
    modelMemoryLimit: { valid: true },
    bucketSpan: { valid: true },
    duplicateDetectors: { valid: true },
    query: { valid: true },
    queryDelay: { valid: true },
    frequency: { valid: true },
    scrollSize: { valid: true },
  };
  private _validating: boolean = false;
  private _basicValidationResult$ = new ReplaySubject<JobValidationResult>(2);

  private _jobCreatorSubject$ = new Subject<JobCreator>();

  /**
   * Observable that combines basic and async validation results.
   */
  public validationResult$: Observable<JobValidationResult>;

  constructor(jobCreator: JobCreatorType, existingJobsAndGroups: ExistingJobsAndGroups) {
    this._jobCreator = jobCreator;
    this._lastJobConfig = this._jobCreator.formattedJobJson;
    this._lastDatafeedConfig = this._jobCreator.formattedDatafeedJson;
    this._validationSummary = {
      basic: false,
      advanced: false,
    };
    this._existingJobsAndGroups = existingJobsAndGroups;

    this._asyncValidators$ = [cardinalityValidator(this._jobCreatorSubject$)];

    this._asyncValidatorsResult$ = combineLatest(this._asyncValidators$).pipe(
      map(res => {
        return res.reduce((acc, curr) => {
          return {
            ...acc,
            ...(curr ? curr : {}),
          };
        }, {});
      })
    );

    this.validationResult$ = combineLatest([
      this._basicValidationResult$,
      this._asyncValidatorsResult$,
    ]).pipe(
      map(([basicValidationResult, asyncValidatorsResult]) => {
        return {
          ...basicValidationResult,
          ...asyncValidatorsResult,
        };
      }),
      tap(latestValidationResult => {
        this.latestValidationResult = latestValidationResult;
      })
    );
  }

  latestValidationResult: JobValidationResult = this._basicValidations;

  public validate(callback: () => void, forceValidate: boolean = false) {
    this._validating = true;
    const formattedJobConfig = this._jobCreator.formattedJobJson;
    const formattedDatafeedConfig = this._jobCreator.formattedDatafeedJson;

    // only validate if the config has changed
    if (
      forceValidate ||
      formattedJobConfig !== this._lastJobConfig ||
      formattedDatafeedConfig !== this._lastDatafeedConfig
    ) {
      if (this._validateTimeout !== null) {
        // clear any previous on going validation timeouts
        clearTimeout(this._validateTimeout);
      }
      this._lastJobConfig = formattedJobConfig;
      this._lastDatafeedConfig = formattedDatafeedConfig;
      this._validateTimeout = setTimeout(() => {
        this._runBasicValidation();

        this._jobCreatorSubject$.next(this._jobCreator);

        this._validating = false;
        this._validateTimeout = null;
        callback();
      }, VALIDATION_DELAY_MS);
    } else {
      // _validating is still true if there is a previous validation timeout on going.
      this._validating = this._validateTimeout !== null;
    }
    callback();
  }

  private _resetBasicValidations() {
    this._validationSummary.basic = true;
    Object.values(this._basicValidations).forEach(v => {
      v.valid = true;
      delete v.message;
    });
  }

  private _runBasicValidation() {
    this._resetBasicValidations();

    const jobConfig = this._jobCreator.jobConfig;
    const datafeedConfig = this._jobCreator.datafeedConfig;
    const limits = getNewJobLimits();

    // run standard basic validation
    const basicJobResults = basicJobValidation(jobConfig, undefined, limits);
    populateValidationMessages(basicJobResults, this._basicValidations, jobConfig, datafeedConfig);

    const basicDatafeedResults = basicDatafeedValidation(datafeedConfig);
    populateValidationMessages(
      basicDatafeedResults,
      this._basicValidations,
      jobConfig,
      datafeedConfig
    );

    // run addition job and group id validation
    const idResults = checkForExistingJobAndGroupIds(
      this._jobCreator.jobId,
      this._jobCreator.groups,
      this._existingJobsAndGroups
    );
    populateValidationMessages(idResults, this._basicValidations, jobConfig, datafeedConfig);

    this._validationSummary.basic = this._isOverallBasicValid();
    // Update validation results subject
    this._basicValidationResult$.next(this._basicValidations);
  }

  private _isOverallBasicValid() {
    return Object.values(this._basicValidations).some(v => v.valid === false) === false;
  }

  public get validationSummary(): ValidationSummary {
    return this._validationSummary;
  }

  public get bucketSpan(): Validation {
    return this._basicValidations.bucketSpan;
  }

  public get duplicateDetectors(): Validation {
    return this._basicValidations.duplicateDetectors;
  }

  public get jobId(): Validation {
    return this._basicValidations.jobId;
  }

  public get groupIds(): Validation {
    return this._basicValidations.groupIds;
  }

  public get modelMemoryLimit(): Validation {
    return this._basicValidations.modelMemoryLimit;
  }

  public get query(): Validation {
    return this._basicValidations.query;
  }

  public get queryDelay(): Validation {
    return this._basicValidations.queryDelay;
  }

  public get frequency(): Validation {
    return this._basicValidations.frequency;
  }

  public get scrollSize(): Validation {
    return this._basicValidations.scrollSize;
  }

  public set advancedValid(valid: boolean) {
    this._validationSummary.advanced = valid;
  }

  public get validating(): boolean {
    return this._validating;
  }
}

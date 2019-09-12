/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { basicJobValidation } from '../../../../../common/util/job_utils';
import { newJobLimits } from '../../../new_job/utils/new_job_defaults';
import { JobCreatorType } from '../job_creator';
import { populateValidationMessages, checkForExistingJobAndGroupIds } from './util';
import { ExistingJobsAndGroups } from '../../../../services/job_service';

// delay start of validation to allow the user to make changes
// e.g. if they are typing in a new value, try not to validate
// after every keystroke
const VALIDATION_DELAY_MS = 500;

export interface ValidationSummary {
  basic: boolean;
  advanced: boolean;
}

export interface Validation {
  valid: boolean;
  message?: string;
}

export interface BasicValidations {
  jobId: Validation;
  groupIds: Validation;
  modelMemoryLimit: Validation;
  bucketSpan: Validation;
  duplicateDetectors: Validation;
}

export class JobValidator {
  private _jobCreator: JobCreatorType;
  private _validationSummary: ValidationSummary;
  private _lastJobConfig: string;
  private _validateTimeout: ReturnType<typeof setTimeout> | null = null;
  private _existingJobsAndGroups: ExistingJobsAndGroups;
  private _basicValidations: BasicValidations = {
    jobId: { valid: true },
    groupIds: { valid: true },
    modelMemoryLimit: { valid: true },
    bucketSpan: { valid: true },
    duplicateDetectors: { valid: true },
  };
  private _validating: boolean = false;

  constructor(jobCreator: JobCreatorType, existingJobsAndGroups: ExistingJobsAndGroups) {
    this._jobCreator = jobCreator;
    this._lastJobConfig = this._jobCreator.formattedJobJson;
    this._validationSummary = {
      basic: false,
      advanced: false,
    };
    this._existingJobsAndGroups = existingJobsAndGroups;
  }

  public validate(callback: () => void) {
    this._validating = true;
    const formattedJobConfig = this._jobCreator.formattedJobJson;
    // only validate if the config has changed
    if (formattedJobConfig !== this._lastJobConfig) {
      if (this._validateTimeout !== null) {
        // clear any previous on going validation timeouts
        clearTimeout(this._validateTimeout);
      }
      this._lastJobConfig = formattedJobConfig;
      this._validateTimeout = setTimeout(() => {
        this._runBasicValidation();
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
    const limits = newJobLimits();

    // run standard basic validation
    const basicResults = basicJobValidation(jobConfig, undefined, limits);
    populateValidationMessages(basicResults, this._basicValidations, jobConfig);

    // run addition job and group id validation
    const idResults = checkForExistingJobAndGroupIds(
      this._jobCreator.jobId,
      this._jobCreator.groups,
      this._existingJobsAndGroups
    );
    populateValidationMessages(idResults, this._basicValidations, jobConfig);

    this._validationSummary.basic = this._isOverallBasicValid();
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

  public set advancedValid(valid: boolean) {
    this._validationSummary.advanced = valid;
  }

  public get validating(): boolean {
    return this._validating;
  }
}

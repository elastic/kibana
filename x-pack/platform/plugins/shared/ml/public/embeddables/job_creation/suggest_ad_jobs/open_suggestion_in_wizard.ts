/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import type { JobSuggestion } from '../../../../common/types/job_suggestions';
import type { JobCreatorType } from '../../../application/jobs/new_job/common/job_creator';
import { jobCloningService } from '../../../application/services/job_cloning_service';

export interface WizardTarget {
  dataViewId?: string;
  savedSearchId?: string;
  projectRouting?: string;
}

/**
 * Builds the path, relative to the ML management section, of the wizard which suits a suggestion.
 */
export const getWizardPath = (
  { jobType }: Pick<JobSuggestion, 'jobType'>,
  { dataViewId, savedSearchId, projectRouting }: WizardTarget
): string => {
  const params = new URLSearchParams();
  if (savedSearchId) {
    params.set('savedSearchId', savedSearchId);
  } else if (dataViewId) {
    params.set('index', dataViewId);
  }
  if (projectRouting) {
    params.set('project_routing', projectRouting);
  }
  return `/jobs/new_job/${jobType}?${params.toString()}`;
};

/**
 * Hands the job of a suggestion to the job wizards, in the same way as a job which is being cloned.
 * The wizard opens with the job already filled in, and the time range of the data selected.
 */
export const stashSuggestion = ({ job, datafeed }: JobSuggestion): void => {
  jobCloningService.stashJobForCloning(
    {
      jobConfig: cloneDeep(job),
      datafeedConfig: cloneDeep(datafeed),
      createdBy: job.custom_settings?.created_by,
    } as unknown as JobCreatorType,
    // the time range step is skipped, and the full time range of the data is used
    true,
    false,
    true
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ConfigTemplate, Job } from './types';

/**
 * Returns all `jobIds` for each configTemplate provided
 *
 * @param templates ConfigTemplates as provided by ML Team (https://github.com/elastic/machine-learning-data/issues/194#issuecomment-505779406)
 */
export const getJobsToInstall = (templates: ConfigTemplate[]): string[] =>
  templates.reduce((jobs: string[], template) => [...jobs, ...template.jobs], []);

/**
 * Returns which ConfigTemplates that need to be installed based off of which Jobs are already installed and the configured indexPattern
 *
 * @param templates ConfigTemplates as provided by ML Team
 * @param installedJobIds list of installed JobIds
 * @param indexPattern Comma separated string of the user's currently configured IndexPattern
 */
export const getConfigTemplatesToInstall = (
  templates: ConfigTemplate[],
  installedJobIds: string[],
  indexPattern: string
): ConfigTemplate[] =>
  templates
    .filter(ct => !ct.jobs.every(ctJobId => installedJobIds.includes(ctJobId)))
    .filter(ct => indexPattern.indexOf(ct.defaultIndexPattern) >= 0);

/**
 * Returns a filtered array of Jobs that based on filterGroup selection (Elastic vs Custom Jobs) and any user provided filterQuery
 *
 * @param jobs to filter
 * @param embeddedJobIds jobIds as defined in the ConfigTemplates provided by the ML Team
 * @param showCustomJobs whether or not to show all Custom Jobs, or just the embedded Elastic Jobs
 * @param filterQuery user-provided search string to filter for occurrence in job names/description
 */
export const getJobsToDisplay = (
  jobs: Job[] | null,
  embeddedJobIds: string[],
  showCustomJobs: boolean,
  showElasticJobs: boolean,
  filterQuery?: string
): Job[] =>
  jobs
    ? searchFilter(
        jobs
          .filter(job => (showCustomJobs ? embeddedJobIds.includes(job.id) : true))
          .filter(job => (showElasticJobs ? !embeddedJobIds.includes(job.id) : true)),
        filterQuery
      )
    : [];

/**
 * Returns filtered array of Jobs based on user-provided search string to filter for occurrence in job names/description
 *
 * @param jobs to filter
 * @param filterQuery user-provided search string to filter for occurrence in job names/description
 */
export const searchFilter = (jobs: Job[], filterQuery?: string): Job[] =>
  jobs.filter(job =>
    filterQuery == null
      ? true
      : job.id.includes(filterQuery) || job.description.includes(filterQuery)
  );

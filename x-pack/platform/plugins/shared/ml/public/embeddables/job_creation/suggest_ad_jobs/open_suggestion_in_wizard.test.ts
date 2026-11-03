/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CREATED_BY_LABEL, JOB_TYPE } from '../../../../common/constants/new_job';
import type { JobSuggestion } from '../../../../common/types/job_suggestions';
import { jobCloningService } from '../../../application/services/job_cloning_service';
import { getWizardPath, stashSuggestion } from './open_suggestion_in_wizard';

const suggestion: JobSuggestion = {
  id: 'suggestion-1',
  title: 'Unusual traffic',
  description: 'Finds unusual traffic.',
  jobType: JOB_TYPE.MULTI_METRIC,
  job: {
    job_id: 'ai-unusual-traffic-abc123',
    description: 'Suggested by AI.',
    analysis_config: { bucket_span: '15m', detectors: [{ function: 'count' }], influencers: [] },
    data_description: { time_field: '@timestamp' },
    custom_settings: { created_by: CREATED_BY_LABEL.MULTI_METRIC },
  },
  datafeed: {
    datafeed_id: 'datafeed-ai-unusual-traffic-abc123',
    job_id: 'ai-unusual-traffic-abc123',
    indices: ['logs-*'],
    query: { match_all: {} },
  },
  validation: { status: 'valid', messages: [] },
};

describe('getWizardPath', () => {
  it('opens the wizard for the job type on the data view', () => {
    expect(getWizardPath(suggestion, { dataViewId: 'dv-1' })).toBe(
      '/jobs/new_job/multi_metric?index=dv-1'
    );
  });

  it.each(Object.values(JOB_TYPE))('uses the %s wizard', (jobType) => {
    expect(getWizardPath({ jobType }, { dataViewId: 'dv-1' })).toBe(
      `/jobs/new_job/${jobType}?index=dv-1`
    );
  });

  it('prefers a saved search over a data view', () => {
    expect(getWizardPath(suggestion, { dataViewId: 'dv-1', savedSearchId: 'search-1' })).toBe(
      '/jobs/new_job/multi_metric?savedSearchId=search-1'
    );
  });

  it('keeps the project routing', () => {
    expect(
      getWizardPath(suggestion, { dataViewId: 'dv-1', projectRouting: '_alias:_origin' })
    ).toBe('/jobs/new_job/multi_metric?index=dv-1&project_routing=_alias%3A_origin');
  });
});

describe('stashSuggestion', () => {
  beforeEach(() => {
    jobCloningService.clearJobCloningData();
  });

  it('stashes the job and datafeed for the wizard to clone', () => {
    stashSuggestion(suggestion);

    expect(jobCloningService.job).toEqual(suggestion.job);
    expect(jobCloningService.datafeed).toEqual(suggestion.datafeed);
    expect(jobCloningService.createdBy).toBe(CREATED_BY_LABEL.MULTI_METRIC);
  });

  it('skips the time range step and uses the time range of the data', () => {
    stashSuggestion(suggestion);

    expect(jobCloningService.skipTimeRangeStep).toBe(true);
    expect(jobCloningService.autoSetTimeRange).toBe(true);
    expect(jobCloningService.start).toBeUndefined();
    expect(jobCloningService.end).toBeUndefined();
  });

  it('does not share the configuration with the suggestion', () => {
    stashSuggestion(suggestion);

    // the wizards change the configuration they are given
    jobCloningService.job.analysis_config.detectors.push({ function: 'mean' });

    expect(suggestion.job.analysis_config.detectors).toHaveLength(1);
  });
});

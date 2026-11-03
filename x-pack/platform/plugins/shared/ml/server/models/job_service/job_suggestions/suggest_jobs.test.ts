/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import type { ScopedModel } from '@kbn/agent-builder-server';
import type { MlClient } from '../../../lib/ml_client';
import { DEFAULT_TIME_RANGE_MS, MAX_REVISION_ATTEMPTS } from './constants';
import { gatherEvidence } from './gather_evidence';
import { interpretData } from './interpret_data';
import { proposeJobs, reviseCandidate } from './propose_jobs';
import type { DataProfile, JobCandidate } from './schemas';
import { suggestJobs } from './suggest_jobs';
import type { IndexEvidence } from './types';
import { checkCandidate } from './validate_candidates';

jest.mock('../../../lib/log', () => ({ mlLog: { debug: jest.fn(), warn: jest.fn() } }));
jest.mock('./gather_evidence');
jest.mock('./interpret_data');
jest.mock('./propose_jobs');
jest.mock('./validate_candidates');

const gatherEvidenceMock = jest.mocked(gatherEvidence);
const interpretDataMock = jest.mocked(interpretData);
const proposeJobsMock = jest.mocked(proposeJobs);
const reviseCandidateMock = jest.mocked(reviseCandidate);
const checkCandidateMock = jest.mocked(checkCandidate);

const evidence: IndexEvidence = {
  index: 'logs-*',
  timeField: '@timestamp',
  timeRange: { start: 0, end: 1000 },
  docCount: 100,
  emptyBucketFraction: 0,
  sampleDocs: [],
  recognizerModules: [],
  fields: [
    { name: 'host.name', kind: 'keyword', cardinality: 5 },
    { name: 'bytes', kind: 'numeric', nullRate: 0 },
  ],
};

const profile: DataProfile = {
  datasetSummary: 'Web logs',
  domain: 'web',
  entityFields: ['host.name'],
  measureFields: ['bytes'],
  behavioursOfInterest: ['traffic spikes'],
};

const candidate = (title: string, overrides: Partial<JobCandidate> = {}): JobCandidate => ({
  title,
  description: `${title} description`,
  rationale: 'because',
  bucket_span: '15m',
  detectors: [{ function: 'high_mean', field_name: 'bytes', partition_field_name: 'host.name' }],
  influencers: ['host.name'],
  ...overrides,
});

const countCandidate = (title: string) =>
  candidate(title, { detectors: [{ function: 'high_count', partition_field_name: 'host.name' }] });

const deps = {
  client: {} as IScopedClusterClient,
  mlClient: {} as MlClient,
  model: {} as ScopedModel,
  isSecurityDisabled: false,
};

describe('suggestJobs', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    gatherEvidenceMock.mockResolvedValue(evidence);
    interpretDataMock.mockResolvedValue(profile);
    checkCandidateMock.mockResolvedValue({
      blockingProblems: [],
      warnings: [],
      modelMemoryLimit: '20MB',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns validated suggestions with their own title and description', async () => {
    proposeJobsMock.mockResolvedValue([candidate('Traffic spikes'), countCandidate('Busy hosts')]);

    const suggestions = await suggestJobs(deps, { index: 'logs-*' });

    expect(suggestions).toHaveLength(2);
    expect(suggestions[0]).toMatchObject({
      id: 'suggestion-1',
      title: 'Traffic spikes',
      description: 'Traffic spikes description',
      jobType: 'multi_metric',
      estimatedModelMemoryLimit: '20MB',
      validation: { status: 'valid', messages: [] },
    });
    expect(suggestions[0].job.description).toContain('Suggested by AI');
    expect(suggestions[0].job.description).not.toBe(suggestions[0].description);
    expect(suggestions[0].job.analysis_limits).toEqual({ model_memory_limit: '20MB' });
    expect(suggestions[0].datafeed.job_id).toBe(suggestions[0].job.job_id);
    expect(suggestions[1].id).toBe('suggestion-2');
  });

  it('analyses the last 30 days by default', async () => {
    proposeJobsMock.mockResolvedValue([candidate('Traffic spikes')]);
    jest.spyOn(Date, 'now').mockReturnValue(DEFAULT_TIME_RANGE_MS * 2);

    await suggestJobs(deps, { index: 'logs-*' });

    expect(gatherEvidenceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'logs-*',
        start: DEFAULT_TIME_RANGE_MS,
        end: DEFAULT_TIME_RANGE_MS * 2,
      })
    );
  });

  it('uses the time range which is given', async () => {
    proposeJobsMock.mockResolvedValue([candidate('Traffic spikes')]);

    await suggestJobs(deps, { index: 'logs-*', start: 100, end: 200 });

    expect(gatherEvidenceMock).toHaveBeenCalledWith(
      expect.objectContaining({ start: 100, end: 200 })
    );
  });

  it('rejects a time range which ends before it starts', async () => {
    await expect(
      suggestJobs(deps, { index: 'logs-*', start: 200, end: 100 })
    ).rejects.toMatchObject({ output: { statusCode: 400 } });
    expect(gatherEvidenceMock).not.toHaveBeenCalled();
  });

  it('asks the model for more candidates than are returned', async () => {
    proposeJobsMock.mockResolvedValue([candidate('Traffic spikes')]);

    await suggestJobs(deps, { index: 'logs-*', maxSuggestions: 3 });

    expect(proposeJobsMock).toHaveBeenCalledWith(expect.objectContaining({ count: 5 }));
  });

  it('limits the number of suggestions', async () => {
    proposeJobsMock.mockResolvedValue([
      candidate('One'),
      countCandidate('Two'),
      candidate('Three', {
        detectors: [
          { function: 'low_mean', field_name: 'bytes', partition_field_name: 'host.name' },
        ],
      }),
    ]);

    const suggestions = await suggestJobs(deps, { index: 'logs-*', maxSuggestions: 2 });

    expect(suggestions.map(({ title }) => title)).toEqual(['One', 'Two']);
  });

  it('removes suggestions which repeat the detectors of an earlier one', async () => {
    proposeJobsMock.mockResolvedValue([candidate('One'), candidate('Same again')]);

    const suggestions = await suggestJobs(deps, { index: 'logs-*' });

    expect(suggestions.map(({ title }) => title)).toEqual(['One']);
  });

  it('puts suggestions without warnings first and keeps the warnings', async () => {
    proposeJobsMock.mockResolvedValue([candidate('Noisy'), countCandidate('Clean')]);
    checkCandidateMock
      .mockResolvedValueOnce({
        blockingProblems: [],
        warnings: [{ id: 'mml_greater_than_max_mml', status: 'warning' }],
      })
      .mockResolvedValueOnce({ blockingProblems: [], warnings: [] });

    const suggestions = await suggestJobs(deps, { index: 'logs-*' });

    expect(suggestions.map(({ title }) => title)).toEqual(['Clean', 'Noisy']);
    expect(suggestions[1].validation).toEqual({
      status: 'warning',
      messages: [{ id: 'mml_greater_than_max_mml', status: 'warning' }],
    });
    expect(suggestions[1].estimatedModelMemoryLimit).toBeUndefined();
  });

  describe('split fields', () => {
    it('uses a partition field where the model used a by field', async () => {
      proposeJobsMock.mockResolvedValue([
        candidate('By host', {
          detectors: [{ function: 'high_mean', field_name: 'bytes', by_field_name: 'host.name' }],
        }),
      ]);

      const [suggestion] = await suggestJobs(deps, { index: 'logs-*' });

      expect(suggestion.job.analysis_config.detectors).toEqual([
        expect.objectContaining({ function: 'high_mean', partition_field_name: 'host.name' }),
      ]);
      expect(suggestion.job.analysis_config.detectors?.[0]).not.toHaveProperty('by_field_name');
      expect(suggestion.jobType).toBe('multi_metric');
    });

    it('uses a partition field in a revised candidate too', async () => {
      proposeJobsMock.mockResolvedValue([candidate('Broken', { bucket_span: 'soon' })]);
      reviseCandidateMock.mockResolvedValue(
        candidate('Fixed', { detectors: [{ function: 'high_count', by_field_name: 'host.name' }] })
      );

      const [suggestion] = await suggestJobs(deps, { index: 'logs-*' });

      expect(suggestion.job.analysis_config.detectors?.[0]).toMatchObject({
        partition_field_name: 'host.name',
      });
    });

    it('keeps by and over fields in population jobs', async () => {
      proposeJobsMock.mockResolvedValue([
        candidate('Population', {
          detectors: [
            {
              function: 'high_mean',
              field_name: 'bytes',
              by_field_name: 'host.name',
              over_field_name: 'host.name',
            },
          ],
        }),
      ]);

      const [suggestion] = await suggestJobs(deps, { index: 'logs-*' });

      expect(suggestion.job.analysis_config.detectors?.[0]).toMatchObject({
        by_field_name: 'host.name',
        over_field_name: 'host.name',
      });
    });
  });

  describe('candidates which fail', () => {
    it('sends structural problems back to the model and uses the fixed candidate', async () => {
      const broken = candidate('Broken', {
        detectors: [
          { function: 'high_mean', field_name: 'missing', partition_field_name: 'host.name' },
        ],
      });
      proposeJobsMock.mockResolvedValue([broken]);
      reviseCandidateMock.mockResolvedValue(candidate('Fixed'));

      const suggestions = await suggestJobs(deps, { index: 'logs-*' });

      expect(reviseCandidateMock).toHaveBeenCalledTimes(1);
      expect(reviseCandidateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          candidate: broken,
          problems: [expect.stringContaining('"missing" is not a field in the index')],
        })
      );
      expect(suggestions.map(({ title }) => title)).toEqual(['Fixed']);
      // a candidate with structural problems is not sent to the ML validation
      expect(checkCandidateMock).toHaveBeenCalledTimes(1);
    });

    it('sends validation errors back to the model', async () => {
      proposeJobsMock.mockResolvedValue([candidate('Needs fixing')]);
      checkCandidateMock.mockResolvedValueOnce({
        blockingProblems: ['datafeed_preview_no_documents: no documents'],
        warnings: [],
      });
      reviseCandidateMock.mockResolvedValue(candidate('Fixed'));

      const suggestions = await suggestJobs(deps, { index: 'logs-*' });

      expect(reviseCandidateMock).toHaveBeenCalledWith(
        expect.objectContaining({ problems: ['datafeed_preview_no_documents: no documents'] })
      );
      expect(suggestions.map(({ title }) => title)).toEqual(['Fixed']);
    });

    it('drops a candidate which is still failing after the attempts are used', async () => {
      proposeJobsMock.mockResolvedValue([candidate('Hopeless'), countCandidate('Fine')]);
      checkCandidateMock.mockImplementation(async ({ built }) =>
        built.job.description.includes('high_mean')
          ? { blockingProblems: ['always wrong'], warnings: [] }
          : { blockingProblems: [], warnings: [] }
      );
      reviseCandidateMock.mockResolvedValue(candidate('Hopeless'));

      const suggestions = await suggestJobs(deps, { index: 'logs-*' });

      expect(reviseCandidateMock).toHaveBeenCalledTimes(MAX_REVISION_ATTEMPTS);
      expect(suggestions.map(({ title }) => title)).toEqual(['Fine']);
    });

    it('drops a candidate when the model cannot revise it', async () => {
      proposeJobsMock.mockResolvedValue([
        candidate('Broken', { bucket_span: 'soon' }),
        countCandidate('Fine'),
      ]);
      reviseCandidateMock.mockRejectedValue(new Error('model failed'));

      const suggestions = await suggestJobs(deps, { index: 'logs-*' });

      expect(suggestions.map(({ title }) => title)).toEqual(['Fine']);
    });

    it('returns no suggestions when every candidate is dropped', async () => {
      proposeJobsMock.mockResolvedValue([candidate('Broken', { bucket_span: 'soon' })]);
      reviseCandidateMock.mockRejectedValue(new Error('model failed'));

      await expect(suggestJobs(deps, { index: 'logs-*' })).resolves.toEqual([]);
    });
  });

  it('passes errors from gathering evidence to the caller', async () => {
    gatherEvidenceMock.mockRejectedValue(new Error('no data'));

    await expect(suggestJobs(deps, { index: 'logs-*' })).rejects.toThrow('no data');
    expect(proposeJobsMock).not.toHaveBeenCalled();
  });
});

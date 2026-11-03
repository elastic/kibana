/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CREATED_BY_LABEL, JOB_TYPE } from '../../../../common/constants/new_job';
import {
  buildJobAndDatafeed,
  classifyJobType,
  findCandidateProblems,
  generateJobId,
  normalizeDatafeedQuery,
  preferPartitionFields,
} from './build_job_config';
import type { JobCandidate } from './schemas';
import type { IndexEvidence } from './types';

const evidence: IndexEvidence = {
  index: 'logs-*,metrics-*',
  timeField: '@timestamp',
  timeRange: { start: 0, end: 1000 },
  docCount: 5000,
  emptyBucketFraction: 0,
  sampleDocs: [],
  recognizerModules: [],
  fields: [
    { name: 'host.name', kind: 'keyword', cardinality: 12 },
    { name: 'user.name', kind: 'keyword', cardinality: 50000 },
    { name: 'source.ip', kind: 'ip', cardinality: 300 },
    { name: 'http.response.bytes', kind: 'numeric', nullRate: 0 },
    { name: 'message', kind: 'text' },
    { name: 'client.geo.location', kind: 'geo_point' },
    { name: '@timestamp', kind: 'date' },
  ],
};

const candidate = (overrides: Partial<JobCandidate> = {}): JobCandidate => ({
  title: 'Unusual traffic per host',
  description: 'Finds hosts sending unusually large amounts of data.',
  rationale: 'Bytes per host is the main measure.',
  bucket_span: '15m',
  detectors: [
    { function: 'high_mean', field_name: 'http.response.bytes', by_field_name: 'host.name' },
  ],
  influencers: ['host.name'],
  ...overrides,
});

describe('findCandidateProblems', () => {
  it('accepts a valid candidate', () => {
    expect(findCandidateProblems(candidate(), evidence)).toEqual([]);
  });

  it('rejects an invalid bucket span', () => {
    const problems = findCandidateProblems(candidate({ bucket_span: 'fifteen' }), evidence);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('bucket_span');
  });

  it('rejects an unknown function', () => {
    const problems = findCandidateProblems(
      candidate({ detectors: [{ function: 'high_magic' }] }),
      evidence
    );
    expect(problems[0]).toContain('not a known function');
  });

  it('rejects fields which are not in the index', () => {
    const problems = findCandidateProblems(
      candidate({ detectors: [{ function: 'mean', field_name: 'missing.field' }] }),
      evidence
    );
    expect(problems[0]).toContain('not a field in the index');
  });

  it('rejects a metric function on a field which is not numeric', () => {
    const problems = findCandidateProblems(
      candidate({ detectors: [{ function: 'mean', field_name: 'host.name' }] }),
      evidence
    );
    expect(problems[0]).toContain('needs numeric');
  });

  it('requires a field name for functions which need one', () => {
    const problems = findCandidateProblems(
      candidate({ detectors: [{ function: 'mean' }] }),
      evidence
    );
    expect(problems[0]).toContain('field_name is required');
  });

  it('rejects a field name on functions which take none', () => {
    const problems = findCandidateProblems(
      candidate({ detectors: [{ function: 'count', field_name: 'host.name' }] }),
      evidence
    );
    expect(problems[0]).toContain('must not be set');
  });

  it('requires by_field_name for rare', () => {
    const problems = findCandidateProblems(
      candidate({ detectors: [{ function: 'rare' }] }),
      evidence
    );
    expect(problems[0]).toContain('by_field_name is required');
  });

  it('requires both by and over fields for freq_rare', () => {
    const problems = findCandidateProblems(
      candidate({ detectors: [{ function: 'freq_rare', by_field_name: 'host.name' }] }),
      evidence
    );
    expect(problems[0]).toContain('over_field_name are required');
  });

  it('rejects splitting on text fields', () => {
    const problems = findCandidateProblems(
      candidate({ detectors: [{ function: 'count', by_field_name: 'message' }] }),
      evidence
    );
    expect(problems[0]).toContain('Split on keyword or ip fields');
  });

  it('rejects splitting on a field with too many values', () => {
    const problems = findCandidateProblems(
      candidate({ detectors: [{ function: 'rare', by_field_name: 'user.name' }] }),
      evidence
    );
    expect(problems[0]).toContain('too many to split on');
  });

  it('accepts a lat_long detector on a geo_point field', () => {
    expect(
      findCandidateProblems(
        candidate({ detectors: [{ function: 'lat_long', field_name: 'client.geo.location' }] }),
        evidence
      )
    ).toEqual([]);
  });

  describe('categorization', () => {
    const categorization = (overrides: Partial<JobCandidate> = {}) =>
      candidate({
        categorization_field_name: 'message',
        detectors: [{ function: 'count', by_field_name: 'mlcategory' }],
        influencers: [],
        ...overrides,
      });

    it('accepts mlcategory when a categorization field is set', () => {
      expect(findCandidateProblems(categorization(), evidence)).toEqual([]);
    });

    it('requires the categorization field to be a text field', () => {
      const problems = findCandidateProblems(
        categorization({ categorization_field_name: 'host.name' }),
        evidence
      );
      expect(problems[0]).toContain('must be a text field');
    });

    it('does not accept mlcategory without a categorization field', () => {
      const problems = findCandidateProblems(
        categorization({ categorization_field_name: undefined }),
        evidence
      );
      expect(problems[0]).toContain('not a field in the index');
    });
  });
});

describe('preferPartitionFields', () => {
  const withDetectors = (detectors: JobCandidate['detectors']) => candidate({ detectors });

  it('splits with a partition field in place of a by field', () => {
    const { detectors } = preferPartitionFields(
      withDetectors([
        { function: 'high_mean', field_name: 'http.response.bytes', by_field_name: 'host.name' },
        { function: 'count', by_field_name: 'source.ip' },
      ])
    );

    expect(detectors).toEqual([
      {
        function: 'high_mean',
        field_name: 'http.response.bytes',
        partition_field_name: 'host.name',
      },
      { function: 'count', partition_field_name: 'source.ip' },
    ]);
    expect(detectors.every((detector) => detector.by_field_name === undefined)).toBe(true);
  });

  it('leaves rare and freq_rare detectors alone', () => {
    const detectors = [
      { function: 'rare', by_field_name: 'user.name' },
      { function: 'freq_rare', by_field_name: 'user.name', over_field_name: 'host.name' },
    ];
    expect(preferPartitionFields(withDetectors([detectors[0]])).detectors).toEqual([detectors[0]]);
    expect(preferPartitionFields(withDetectors([detectors[1]])).detectors).toEqual([detectors[1]]);
  });

  it('leaves mlcategory alone', () => {
    const detectors = [{ function: 'count', by_field_name: 'mlcategory' }];
    expect(
      preferPartitionFields(
        candidate({ detectors, categorization_field_name: 'message', influencers: [] })
      ).detectors
    ).toEqual(detectors);
  });

  it('keeps the by field when the detector already has a partition field', () => {
    const detectors = [
      { function: 'high_count', by_field_name: 'host.name', partition_field_name: 'source.ip' },
    ];
    expect(preferPartitionFields(withDetectors(detectors)).detectors).toEqual(detectors);
  });

  it('leaves population jobs as they are', () => {
    const detectors = [
      { function: 'high_mean', field_name: 'http.response.bytes', over_field_name: 'source.ip' },
      { function: 'count', by_field_name: 'host.name', over_field_name: 'source.ip' },
      // not part of a population detector itself, but the job is a population job
      { function: 'high_sum', field_name: 'http.response.bytes', by_field_name: 'host.name' },
    ];
    expect(preferPartitionFields(withDetectors(detectors)).detectors).toEqual(detectors);
  });

  it('does not change the candidate it is given', () => {
    const original = withDetectors([{ function: 'count', by_field_name: 'host.name' }]);
    preferPartitionFields(original);
    expect(original.detectors).toEqual([{ function: 'count', by_field_name: 'host.name' }]);
  });

  it('makes jobs which share a partition field fit the multi-metric wizard', () => {
    const { detectors } = preferPartitionFields(
      withDetectors([
        { function: 'high_mean', field_name: 'http.response.bytes', by_field_name: 'host.name' },
        { function: 'count', by_field_name: 'host.name' },
      ])
    );
    expect(classifyJobType({ detectors })).toBe(JOB_TYPE.MULTI_METRIC);
  });
});

describe('classifyJobType', () => {
  const classify = (detectors: JobCandidate['detectors'], categorizationField?: string): JOB_TYPE =>
    classifyJobType({ detectors, categorization_field_name: categorizationField });

  it('classifies a single unsplit detector as single metric', () => {
    expect(classify([{ function: 'mean', field_name: 'http.response.bytes' }])).toBe(
      JOB_TYPE.SINGLE_METRIC
    );
  });

  it('classifies detectors sharing a partition as multi metric', () => {
    expect(
      classify([
        { function: 'mean', field_name: 'http.response.bytes', partition_field_name: 'host.name' },
        { function: 'count', partition_field_name: 'host.name' },
      ])
    ).toBe(JOB_TYPE.MULTI_METRIC);
  });

  it('classifies an over field as population', () => {
    expect(
      classify([
        { function: 'high_mean', field_name: 'http.response.bytes', over_field_name: 'source.ip' },
      ])
    ).toBe(JOB_TYPE.POPULATION);
  });

  it('classifies detectors with different over fields, or a mix, as advanced', () => {
    expect(
      classify([
        { function: 'high_mean', field_name: 'http.response.bytes', over_field_name: 'source.ip' },
        { function: 'high_mean', field_name: 'http.response.bytes', over_field_name: 'host.name' },
      ])
    ).toBe(JOB_TYPE.ADVANCED);
    expect(
      classify([
        { function: 'high_mean', field_name: 'http.response.bytes' },
        { function: 'high_mean', field_name: 'http.response.bytes', over_field_name: 'source.ip' },
      ])
    ).toBe(JOB_TYPE.ADVANCED);
  });

  it('classifies a single rare detector as rare', () => {
    expect(classify([{ function: 'rare', by_field_name: 'host.name' }])).toBe(JOB_TYPE.RARE);
  });

  it('classifies a single lat_long detector as geo', () => {
    expect(classify([{ function: 'lat_long', field_name: 'client.geo.location' }])).toBe(
      JOB_TYPE.GEO
    );
  });

  it('classifies mlcategory detectors with a categorization field as categorization', () => {
    expect(classify([{ function: 'count', by_field_name: 'mlcategory' }], 'message')).toBe(
      JOB_TYPE.CATEGORIZATION
    );
  });

  it('falls back to advanced when a wizard cannot build the job', () => {
    expect(classify([{ function: 'count', by_field_name: 'host.name' }])).toBe(JOB_TYPE.ADVANCED);
    expect(
      classify([
        { function: 'freq_rare', by_field_name: 'host.name', over_field_name: 'source.ip' },
      ])
    ).toBe(JOB_TYPE.ADVANCED);
    expect(classify([{ function: 'time_of_day' }])).toBe(JOB_TYPE.ADVANCED);
    expect(classify([{ function: 'count', by_field_name: 'host.name' }], 'message')).toBe(
      JOB_TYPE.ADVANCED
    );
  });
});

describe('buildJobAndDatafeed', () => {
  it('builds the job and datafeed', () => {
    const { job, datafeed, jobType } = buildJobAndDatafeed({
      candidate: candidate({
        detectors: [
          {
            function: 'high_mean',
            field_name: 'http.response.bytes',
            partition_field_name: 'host.name',
          },
        ],
      }),
      evidence,
      jobId: 'ai-traffic-abc123',
    });

    expect(jobType).toBe(JOB_TYPE.MULTI_METRIC);
    expect(job.job_id).toBe('ai-traffic-abc123');
    expect(job.analysis_config.bucket_span).toBe('15m');
    expect(job.data_description).toEqual({ time_field: '@timestamp' });
    expect(job.custom_settings).toEqual({ created_by: CREATED_BY_LABEL.MULTI_METRIC });
    expect(datafeed).toEqual({
      datafeed_id: 'datafeed-ai-traffic-abc123',
      job_id: 'ai-traffic-abc123',
      indices: ['logs-*', 'metrics-*'],
      query: { bool: { must: [{ match_all: {} }] } },
    });
  });

  it('keeps the datafeed query the model gave', () => {
    const query = { bool: { filter: [{ term: { 'host.name': 'web-01' } }] } };
    const { datafeed } = buildJobAndDatafeed({
      candidate: candidate({ datafeed_query: query }),
      evidence,
      jobId: 'ai-job-abc123',
    });
    expect(datafeed.query).toEqual(query);
  });

  it('always makes the split fields influencers and drops influencers which cannot be used', () => {
    const { job } = buildJobAndDatafeed({
      candidate: candidate({
        influencers: ['source.ip', 'not.a.field', 'http.response.bytes', 'message'],
      }),
      evidence,
      jobId: 'ai-job-abc123',
    });
    expect(job.analysis_config.influencers).toEqual(['host.name', 'source.ip']);
  });

  it('uses at most three influencers, keeping the split fields', () => {
    const { job } = buildJobAndDatafeed({
      candidate: candidate({
        detectors: [
          { function: 'rare', by_field_name: 'user.name', partition_field_name: 'host.name' },
        ],
        influencers: ['source.ip', 'user.name', 'host.name', 'client.geo.location'],
      }),
      evidence,
      jobId: 'ai-job-abc123',
    });
    expect(job.analysis_config.influencers).toEqual(['user.name', 'host.name', 'source.ip']);
  });

  it('describes the job technically, separately from the title and description', () => {
    const { job } = buildJobAndDatafeed({
      candidate: candidate(),
      evidence,
      jobId: 'ai-job-abc123',
    });
    expect(job.description).toBe('Suggested by AI. high_mean(http.response.bytes) by host.name.');
    expect(job.analysis_config.detectors[0].detector_description).toBe(
      'high_mean(http.response.bytes) by host.name'
    );
  });

  it('sets the categorization field', () => {
    const { job, jobType } = buildJobAndDatafeed({
      candidate: candidate({
        categorization_field_name: 'message',
        detectors: [{ function: 'count', by_field_name: 'mlcategory' }],
        influencers: [],
      }),
      evidence,
      jobId: 'ai-job-abc123',
    });
    expect(jobType).toBe(JOB_TYPE.CATEGORIZATION);
    expect(job.analysis_config.categorization_field_name).toBe('message');
    expect(job.analysis_config.influencers).toEqual([]);
  });
});

describe('normalizeDatafeedQuery', () => {
  it('uses the bool query the wizards create when there is no query', () => {
    expect(normalizeDatafeedQuery(undefined)).toEqual({ bool: { must: [{ match_all: {} }] } });
    expect(normalizeDatafeedQuery({})).toEqual({ bool: { must: [{ match_all: {} }] } });
  });

  it('keeps a bool query as it is', () => {
    const query = { bool: { filter: [{ term: { 'host.name': 'web-01' } }] } };
    expect(normalizeDatafeedQuery(query)).toEqual(query);
    const withMust = { bool: { must: [{ term: { 'host.name': 'web-01' } }] } };
    expect(normalizeDatafeedQuery(withMust)).toEqual(withMust);
  });

  it('wraps a query which is not a bool query', () => {
    expect(normalizeDatafeedQuery({ term: { 'host.name': 'web-01' } })).toEqual({
      bool: { must: [{ term: { 'host.name': 'web-01' } }] },
    });
    expect(normalizeDatafeedQuery({ match_all: {} })).toEqual({
      bool: { must: [{ match_all: {} }] },
    });
  });

  it('makes must an array', () => {
    expect(
      normalizeDatafeedQuery({
        bool: { must: { term: { a: 'b' } }, filter: [{ term: { c: 'd' } }] },
      })
    ).toEqual({ bool: { must: [{ term: { a: 'b' } }], filter: [{ term: { c: 'd' } }] } });
  });
});

describe('generateJobId', () => {
  it('builds a valid job id from the title', () => {
    expect(generateJobId('Unusual spikes in failed logins!')).toMatch(
      /^ai-unusual-spikes-in-failed-logins-[0-9a-f]{6}$/
    );
  });

  it('copes with titles which have no usable characters', () => {
    expect(generateJobId('???')).toMatch(/^ai-[0-9a-f]{6}$/);
  });

  it('keeps ids short, with no doubled or trailing hyphens', () => {
    const id = generateJobId(`${'word '.repeat(30)}`);
    expect(id.length).toBeLessThanOrEqual(64);
    expect(id).not.toMatch(/--/);
    expect(id).toMatch(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/);
  });
});

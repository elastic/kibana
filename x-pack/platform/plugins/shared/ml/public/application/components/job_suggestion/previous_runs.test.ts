/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Storage } from '@kbn/kibana-utils-plugin/public';
import { JOB_TYPE } from '../../../../common/constants/new_job';
import type { JobSuggestion } from '../../../../common/types/job_suggestions';
import { clearRun, getPreviousRun, saveRun } from './previous_runs';
import type { SuggestionRun } from './previous_runs';

const suggestion = (id: string): JobSuggestion => ({
  id,
  title: `Title ${id}`,
  description: `Description ${id}`,
  jobType: JOB_TYPE.MULTI_METRIC,
  job: {
    job_id: `job-${id}`,
    description: 'Suggested by AI.',
    analysis_config: { bucket_span: '15m', detectors: [{ function: 'count' }] },
    data_description: { time_field: '@timestamp' },
  },
  datafeed: {
    datafeed_id: `datafeed-job-${id}`,
    job_id: `job-${id}`,
    indices: ['logs-*'],
    query: {},
  },
  validation: { status: 'valid', messages: [] },
});

const run = (
  id: string,
  ranAt = 1000,
  timeRange = { from: 'now-30d', to: 'now' }
): SuggestionRun => ({
  timeRange,
  ranAt,
  suggestions: [suggestion(id)],
});

describe('previous runs', () => {
  let storage: Storage;

  beforeEach(() => {
    window.localStorage.clear();
    storage = new Storage(window.localStorage);
  });

  it('has no previous run to begin with', () => {
    expect(getPreviousRun(storage, 'alice', 'logs-*')).toBeUndefined();
  });

  it('returns the run which was saved', () => {
    saveRun(storage, 'alice', 'logs-*', run('a'));

    expect(getPreviousRun(storage, 'alice', 'logs-*')).toEqual(run('a'));
  });

  it('keeps only the last run for an index pattern', () => {
    saveRun(storage, 'alice', 'logs-*', run('first', 1000));
    saveRun(storage, 'alice', 'logs-*', run('second', 2000));

    expect(getPreviousRun(storage, 'alice', 'logs-*')).toEqual(run('second', 2000));
  });

  it('keeps a run for each index pattern', () => {
    saveRun(storage, 'alice', 'logs-*', run('logs'));
    saveRun(storage, 'alice', 'metrics-*', run('metrics'));

    expect(getPreviousRun(storage, 'alice', 'logs-*')).toEqual(run('logs'));
    expect(getPreviousRun(storage, 'alice', 'metrics-*')).toEqual(run('metrics'));
  });

  it('returns the last run whatever time range it was made over', () => {
    const lastWeek = { from: 'now-7d', to: 'now' };
    saveRun(storage, 'alice', 'logs-*', run('a', 1000, lastWeek));

    expect(getPreviousRun(storage, 'alice', 'logs-*')?.timeRange).toEqual(lastWeek);
  });

  it('keeps the runs of different users apart', () => {
    saveRun(storage, 'alice', 'logs-*', run('alice'));

    expect(getPreviousRun(storage, 'bob', 'logs-*')).toBeUndefined();
    saveRun(storage, 'bob', 'logs-*', run('bob'));
    expect(getPreviousRun(storage, 'alice', 'logs-*')).toEqual(run('alice'));
    expect(getPreviousRun(storage, 'bob', 'logs-*')).toEqual(run('bob'));
  });

  it('forgets the least recently run index patterns when there are too many', () => {
    for (let i = 1; i <= 21; i++) {
      saveRun(storage, 'alice', `index-${i}`, run(`run-${i}`, i * 1000));
    }

    expect(getPreviousRun(storage, 'alice', 'index-1')).toBeUndefined();
    expect(getPreviousRun(storage, 'alice', 'index-2')).toEqual(run('run-2', 2000));
    expect(getPreviousRun(storage, 'alice', 'index-21')).toEqual(run('run-21', 21000));
  });

  it('ignores what is stored when it is not a run', () => {
    storage.set('ml.suggestedJobs.lastRuns.alice', {
      'logs-*': { ranAt: 'yesterday' },
      'metrics-*': { ...run('b'), suggestions: [{ id: 'no-job' }] },
      'empty-*': { ...run('c'), suggestions: [] },
      'good-*': run('good'),
    });

    expect(getPreviousRun(storage, 'alice', 'logs-*')).toBeUndefined();
    expect(getPreviousRun(storage, 'alice', 'metrics-*')).toBeUndefined();
    expect(getPreviousRun(storage, 'alice', 'empty-*')).toBeUndefined();
    expect(getPreviousRun(storage, 'alice', 'good-*')).toEqual(run('good'));
  });

  it('ignores what is stored when it is not an object', () => {
    window.localStorage.setItem('ml.suggestedJobs.lastRuns.alice', 'not json {');
    expect(getPreviousRun(storage, 'alice', 'logs-*')).toBeUndefined();

    storage.set('ml.suggestedJobs.lastRuns.alice', [run('a')]);
    expect(getPreviousRun(storage, 'alice', 'logs-*')).toBeUndefined();
  });

  it('carries on when the browser will not store the run', () => {
    jest.spyOn(storage, 'set').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    expect(() => saveRun(storage, 'alice', 'logs-*', run('a'))).not.toThrow();
  });

  it('forgets the run of an index pattern, and no other', () => {
    saveRun(storage, 'alice', 'logs-*', run('a'));
    saveRun(storage, 'alice', 'metrics-*', run('b'));
    saveRun(storage, 'bob', 'logs-*', run('c'));

    clearRun(storage, 'alice', 'logs-*');

    expect(getPreviousRun(storage, 'alice', 'logs-*')).toBeUndefined();
    expect(getPreviousRun(storage, 'alice', 'metrics-*')).toEqual(run('b'));
    expect(getPreviousRun(storage, 'bob', 'logs-*')).toEqual(run('c'));
  });

  it('carries on when the browser will not forget the run', () => {
    saveRun(storage, 'alice', 'logs-*', run('a'));
    jest.spyOn(storage, 'set').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    expect(() => clearRun(storage, 'alice', 'logs-*')).not.toThrow();
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'child_process';
import { ToolingLog } from '@kbn/tooling-log';
import { reportExperimentLinks, resolveEvalsUiKibanaUrl } from './report_experiment_links';

jest.mock('child_process', () => ({
  ...jest.requireActual('child_process'),
  execFileSync: jest.fn(),
}));

const execFileSyncMock = execFileSync as jest.MockedFunction<typeof execFileSync>;

const KIBANA_URL = 'https://elastic:s3cret@golden.kb.example.com';

describe('reportExperimentLinks', () => {
  const previousBuildId = process.env.BUILDKITE_BUILD_ID;
  let log: ToolingLog;
  let infoSpy: jest.SpyInstance;
  let warningSpy: jest.SpyInstance;

  beforeEach(() => {
    execFileSyncMock.mockReset();
    delete process.env.BUILDKITE_BUILD_ID;
    log = new ToolingLog();
    infoSpy = jest.spyOn(log, 'info').mockImplementation(() => {});
    warningSpy = jest.spyOn(log, 'warning').mockImplementation(() => {});
  });

  afterAll(() => {
    if (previousBuildId === undefined) {
      delete process.env.BUILDKITE_BUILD_ID;
    } else {
      process.env.BUILDKITE_BUILD_ID = previousBuildId;
    }
  });

  it('reports nothing when the Kibana URL is not set', () => {
    process.env.BUILDKITE_BUILD_ID = 'build-1';

    reportExperimentLinks({
      log,
      kibanaUrl: undefined,
      experimentIds: ['exp-1'],
      modelId: 'gpt',
    });

    expect(infoSpy).not.toHaveBeenCalled();
    expect(execFileSyncMock).not.toHaveBeenCalled();
  });

  it('logs one link per experiment without credentials outside Buildkite', () => {
    reportExperimentLinks({
      log,
      kibanaUrl: KIBANA_URL,
      experimentIds: ['exp-1', 'exp-2'],
      modelId: 'gpt',
    });

    expect(infoSpy.mock.calls).toEqual([
      ['🔗 https://golden.kb.example.com/app/management/ai/evals/experiments/exp-1'],
      ['🔗 https://golden.kb.example.com/app/management/ai/evals/experiments/exp-2'],
    ]);
    expect(execFileSyncMock).not.toHaveBeenCalled();
  });

  it('logs a single execution link and appends it to the suite annotation on Buildkite', () => {
    process.env.BUILDKITE_BUILD_ID = 'build-1';
    const executionId = 'bk-1::Smoke Tests::gpt';
    const url =
      'https://golden.kb.example.com/s/evals/app/management/ai/evals/experiments/exp-1?execution_id=bk-1%3A%3ASmoke+Tests%3A%3Agpt';

    reportExperimentLinks({
      log,
      kibanaUrl: KIBANA_URL,
      experimentIds: ['exp-1', 'exp-2'],
      executionId,
      suiteId: 'Smoke Tests',
      modelId: 'gpt',
      shardId: '2',
      spaceId: 'evals',
    });

    expect(infoSpy.mock.calls).toEqual([[`🔗 ${url}`]]);
    expect(execFileSyncMock).toHaveBeenCalledWith(
      'buildkite-agent',
      [
        'annotate',
        '--context',
        'kbn-evals-experiments-smoke-tests',
        '--style',
        'info',
        '--append',
        `- [View eval results](${url}) · **Smoke Tests** · model \`gpt\` · shard \`2\`\n`,
      ],
      { stdio: 'ignore' }
    );
  });

  it('warns instead of failing when the annotation cannot be written', () => {
    process.env.BUILDKITE_BUILD_ID = 'build-1';
    execFileSyncMock.mockImplementation(() => {
      throw new Error('buildkite-agent: not found');
    });

    expect(() =>
      reportExperimentLinks({
        log,
        kibanaUrl: KIBANA_URL,
        experimentIds: ['exp-1'],
        executionId: 'bk-1::suite::gpt',
        modelId: 'gpt',
      })
    ).not.toThrow();
    expect(warningSpy).toHaveBeenCalledWith(
      expect.stringContaining('Could not add experiment links to the Buildkite annotation')
    );
  });

  it('warns when the Kibana URL is invalid', () => {
    reportExperimentLinks({
      log,
      kibanaUrl: 'not a url',
      experimentIds: ['exp-1'],
      modelId: 'gpt',
    });

    expect(infoSpy).not.toHaveBeenCalled();
    expect(warningSpy).toHaveBeenCalledWith(
      'Could not build evals UI links: the evaluations Kibana URL is not valid.'
    );
  });
});

describe('resolveEvalsUiKibanaUrl', () => {
  const previousBuildId = process.env.BUILDKITE_BUILD_ID;

  beforeEach(() => {
    delete process.env.BUILDKITE_BUILD_ID;
  });

  afterAll(() => {
    if (previousBuildId === undefined) {
      delete process.env.BUILDKITE_BUILD_ID;
    } else {
      process.env.BUILDKITE_BUILD_ID = previousBuildId;
    }
  });

  it('prefers EVAL_KBN_URL, where the scores were sent', () => {
    process.env.BUILDKITE_BUILD_ID = 'build-1';

    expect(
      resolveEvalsUiKibanaUrl({
        evaluationsKbnUrl: 'https://golden.kb.example.com',
        scoutKibanaUrl: 'http://localhost:5620',
      })
    ).toBe('https://golden.kb.example.com');
  });

  it('falls back to the Scout Kibana for local runs', () => {
    expect(
      resolveEvalsUiKibanaUrl({
        evaluationsKbnUrl: undefined,
        scoutKibanaUrl: 'http://localhost:5620',
      })
    ).toBe('http://localhost:5620');
  });

  it('returns undefined on Buildkite without EVAL_KBN_URL, since the Scout Kibana is ephemeral', () => {
    process.env.BUILDKITE_BUILD_ID = 'build-1';

    expect(
      resolveEvalsUiKibanaUrl({
        evaluationsKbnUrl: undefined,
        scoutKibanaUrl: 'http://localhost:5620',
      })
    ).toBeUndefined();
  });
});

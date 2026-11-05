/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildExecutionCompareUrl, buildExperimentUrl } from './evals_ui_url';

describe('buildExperimentUrl', () => {
  it('links to the experiment detail page with the execution id', () => {
    expect(
      buildExperimentUrl({
        kibanaUrl: 'https://golden.kb.example.com',
        experimentId: 'exp-1',
        executionId: 'bk-123::smoke-tests::gpt',
      })
    ).toBe(
      'https://golden.kb.example.com/app/management/ai/evals/experiments/exp-1?execution_id=bk-123%3A%3Asmoke-tests%3A%3Agpt'
    );
  });

  it('omits the execution id when not set', () => {
    expect(buildExperimentUrl({ kibanaUrl: 'http://localhost:5601', experimentId: 'exp-1' })).toBe(
      'http://localhost:5601/app/management/ai/evals/experiments/exp-1'
    );
  });

  it('drops credentials, query and fragment from the Kibana URL', () => {
    const url = buildExperimentUrl({
      kibanaUrl: 'https://elastic:s3cret@golden.kb.example.com/?apiKey=abc#token',
      experimentId: 'exp-1',
    });

    expect(url).toBe('https://golden.kb.example.com/app/management/ai/evals/experiments/exp-1');
    expect(url).not.toContain('s3cret');
    expect(url).not.toContain('abc');
  });

  it('keeps the Kibana base path and adds a space prefix for non-default spaces', () => {
    expect(
      buildExperimentUrl({
        kibanaUrl: 'https://kb.example.com/base/',
        spaceId: 'evals space',
        experimentId: 'exp-1',
      })
    ).toBe('https://kb.example.com/base/s/evals%20space/app/management/ai/evals/experiments/exp-1');
  });

  it('adds no space prefix for the default space', () => {
    expect(
      buildExperimentUrl({
        kibanaUrl: 'https://kb.example.com',
        spaceId: 'default',
        experimentId: 'exp-1',
      })
    ).toBe('https://kb.example.com/app/management/ai/evals/experiments/exp-1');
  });

  it('returns undefined for an invalid Kibana URL', () => {
    expect(buildExperimentUrl({ kibanaUrl: 'not a url', experimentId: 'exp-1' })).toBeUndefined();
  });
});

describe('buildExecutionCompareUrl', () => {
  it('links to the compare page for two executions', () => {
    expect(
      buildExecutionCompareUrl({
        kibanaUrl: 'https://elastic:changeme@kb.example.com',
        baselineExecutionId: 'base::suite::model',
        targetExecutionId: 'target::suite::model',
      })
    ).toBe(
      'https://kb.example.com/app/management/ai/evals/compare?type=execution&baseline=base%3A%3Asuite%3A%3Amodel&target=target%3A%3Asuite%3A%3Amodel'
    );
  });
});

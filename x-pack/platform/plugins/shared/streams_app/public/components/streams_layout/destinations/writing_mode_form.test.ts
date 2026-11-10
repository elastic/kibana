/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getFilledCustomSignals,
  getSharedIndexInput,
  getSharedRemainderOnSwitch,
  getSharedRemoteIndexOnSwitch,
} from './writing_mode_form';

describe('getFilledCustomSignals', () => {
  it('returns filled signals in signal order and ignores blank fields', () => {
    expect(
      getFilledCustomSignals({
        logsIndex: '',
        metricsIndex: 'metrics-a-*',
        tracesIndex: '  ',
        docsWritePatterns: ['logs-o-*'],
      })
    ).toEqual(['metrics', 'docs']);
  });

  it('returns nothing when no field is filled', () => {
    expect(
      getFilledCustomSignals({
        logsIndex: ' ',
        metricsIndex: '',
        tracesIndex: '',
        docsWritePatterns: [],
      })
    ).toEqual([]);
  });
});

describe('getSharedRemainderOnSwitch', () => {
  it('keeps a remainder all filled fields share', () => {
    expect(
      getSharedRemainderOnSwitch({
        logsIndex: 'logs-a-b',
        metricsIndex: '',
        tracesIndex: 'traces-a-b',
      })
    ).toBe('a-b');
  });

  it('drops remainders that disagree', () => {
    expect(
      getSharedRemainderOnSwitch({
        logsIndex: 'logs-a-b',
        metricsIndex: 'metrics-c-d',
        tracesIndex: '',
      })
    ).toBe('');
  });

  it('drops a value without its own signal prefix', () => {
    expect(
      getSharedRemainderOnSwitch({ logsIndex: 'metrics-a-b', metricsIndex: '', tracesIndex: '' })
    ).toBe('');
  });

  it('returns empty when nothing is filled', () => {
    expect(getSharedRemainderOnSwitch({ logsIndex: '', metricsIndex: '', tracesIndex: '' })).toBe(
      ''
    );
  });

  it('drops a remainder that does not compose back to the typed values', () => {
    expect(
      getSharedRemainderOnSwitch({
        logsIndex: 'logs-logs-default',
        metricsIndex: 'metrics-logs-default',
        tracesIndex: 'traces-logs-default',
      })
    ).toBe('');
  });

  it('drops a remainder that would give a blank signal an invalid name', () => {
    expect(
      getSharedRemainderOnSwitch({
        logsIndex: '',
        metricsIndex: 'metrics-logs-default',
        tracesIndex: '',
      })
    ).toBe('');
  });
});

describe('getSharedIndexInput', () => {
  it('returns the remainder for names composed from it', () => {
    expect(
      getSharedIndexInput({
        logsIndex: 'logs-billing-default',
        metricsIndex: 'metrics-billing-default',
        tracesIndex: 'traces-billing-default',
      })
    ).toBe('billing-default');
  });

  it('keeps a signal prefix the shared name was typed with', () => {
    expect(
      getSharedIndexInput({
        logsIndex: 'logs-billing-default',
        metricsIndex: 'metrics-logs-billing-default',
        tracesIndex: 'traces-logs-billing-default',
      })
    ).toBe('logs-billing-default');
  });
});

describe('getSharedRemoteIndexOnSwitch', () => {
  it('keeps one name used by all filled fields', () => {
    expect(
      getSharedRemoteIndexOnSwitch({ logsIndex: '', metricsIndex: '', tracesIndex: 'my-traces' })
    ).toBe('my-traces');
  });

  it('drops names that disagree', () => {
    expect(
      getSharedRemoteIndexOnSwitch({ logsIndex: 'a', metricsIndex: 'b', tracesIndex: '' })
    ).toBe('');
  });
});

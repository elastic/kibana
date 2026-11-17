/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFilledCustomSignals, getSharedOtelNameOnSwitch } from './writing_mode_form';

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
});

describe('getSharedOtelNameOnSwitch', () => {
  it('keeps the trimmed pair every signal with a dataset shares', () => {
    expect(
      getSharedOtelNameOnSwitch({
        logs: { dataset: ' a ', namespace: 'prod' },
        metrics: { dataset: '', namespace: 'other' },
        traces: { dataset: 'a', namespace: ' prod ' },
      })
    ).toEqual({ dataset: 'a', namespace: 'prod' });
  });

  it.each([
    ['datasets', { dataset: 'a', namespace: 'default' }, { dataset: 'c', namespace: 'default' }],
    ['namespaces', { dataset: 'a', namespace: 'default' }, { dataset: 'a', namespace: 'prod' }],
  ])('drops pairs whose %s differ', (_, logs, metrics) => {
    expect(
      getSharedOtelNameOnSwitch({ logs, metrics, traces: { dataset: '', namespace: 'default' } })
    ).toBeUndefined();
  });

  it('keeps nothing when no signal has a dataset', () => {
    expect(
      getSharedOtelNameOnSwitch({
        logs: { dataset: '', namespace: 'prod' },
        metrics: { dataset: ' ', namespace: 'default' },
        traces: { dataset: '', namespace: 'default' },
      })
    ).toBeUndefined();
  });
});

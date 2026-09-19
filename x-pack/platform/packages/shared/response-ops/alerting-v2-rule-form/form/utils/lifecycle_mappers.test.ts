/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  apiNoDataToFormNoData,
  apiRecoveryToFormRecovery,
  formNoDataToApiNoData,
  formRecoveryToApiRecovery,
  isRecoveryEnabled,
} from './lifecycle_mappers';

describe('formRecoveryToApiRecovery', () => {
  it('projects the condition segment', () => {
    expect(
      formRecoveryToApiRecovery({
        kind: 'alert',
        recovery: { strategy: 'condition', segment: '| WHERE count < 10', query: 'ignored' },
      })
    ).toEqual({ strategy: 'condition', segment: '| WHERE count < 10' });
  });

  it('projects the independent recovery query', () => {
    expect(
      formRecoveryToApiRecovery({
        kind: 'alert',
        recovery: { strategy: 'query', query: 'FROM logs-*', segment: 'ignored' },
      })
    ).toEqual({ strategy: 'query', query: 'FROM logs-*' });
  });

  it.each(['no_breach', 'manual'] as const)('projects the bare %s strategy', (strategy) => {
    expect(
      formRecoveryToApiRecovery({ kind: 'alert', recovery: { strategy, segment: 'ignored' } })
    ).toEqual({ strategy });
  });

  it('returns undefined for signal rules', () => {
    expect(
      formRecoveryToApiRecovery({ kind: 'signal', recovery: { strategy: 'no_breach' } })
    ).toBeUndefined();
  });

  it('falls back to no_breach when the form holds no recovery', () => {
    expect(formRecoveryToApiRecovery({ kind: 'alert', recovery: undefined })).toEqual({
      strategy: 'no_breach',
    });
  });
});

describe('apiRecoveryToFormRecovery', () => {
  it('widens the condition member', () => {
    expect(apiRecoveryToFormRecovery({ strategy: 'condition', segment: '| WHERE ok' })).toEqual({
      strategy: 'condition',
      segment: '| WHERE ok',
    });
  });

  it('widens the query member', () => {
    expect(apiRecoveryToFormRecovery({ strategy: 'query', query: 'FROM logs-*' })).toEqual({
      strategy: 'query',
      query: 'FROM logs-*',
    });
  });

  it('widens the bare members', () => {
    expect(apiRecoveryToFormRecovery({ strategy: 'manual' })).toEqual({ strategy: 'manual' });
  });

  it('returns undefined when the rule has no recovery', () => {
    expect(apiRecoveryToFormRecovery(undefined)).toBeUndefined();
  });
});

describe('formNoDataToApiNoData', () => {
  it.each(['keep_last', 'resolve', 'alert'] as const)('keeps the %s query', (strategy) => {
    expect(
      formNoDataToApiNoData({ kind: 'alert', noData: { strategy, query: 'FROM logs-*' } })
    ).toEqual({ strategy, query: 'FROM logs-*' });
  });

  it('drops a blank query', () => {
    expect(
      formNoDataToApiNoData({ kind: 'alert', noData: { strategy: 'keep_last', query: '  ' } })
    ).toEqual({ strategy: 'keep_last' });
  });

  it('drops the query carried over from another strategy when ignoring', () => {
    expect(
      formNoDataToApiNoData({ kind: 'alert', noData: { strategy: 'ignore', query: 'FROM logs-*' } })
    ).toEqual({ strategy: 'ignore' });
  });

  it('returns undefined for signal rules', () => {
    expect(
      formNoDataToApiNoData({ kind: 'signal', noData: { strategy: 'ignore' } })
    ).toBeUndefined();
  });

  it('falls back to ignore when the form holds no no-data strategy', () => {
    expect(formNoDataToApiNoData({ kind: 'alert', noData: undefined })).toEqual({
      strategy: 'ignore',
    });
  });
});

describe('apiNoDataToFormNoData', () => {
  it('widens a strategy with a query', () => {
    expect(apiNoDataToFormNoData({ strategy: 'alert', query: 'FROM logs-*' })).toEqual({
      strategy: 'alert',
      query: 'FROM logs-*',
    });
  });

  it('widens the ignore member', () => {
    expect(apiNoDataToFormNoData({ strategy: 'ignore' })).toEqual({ strategy: 'ignore' });
  });

  it('returns undefined when the rule has no no-data block', () => {
    expect(apiNoDataToFormNoData(undefined)).toBeUndefined();
  });
});

describe('isRecoveryEnabled', () => {
  it.each(['no_breach', 'condition', 'query'] as const)('is true for %s', (strategy) => {
    expect(isRecoveryEnabled({ kind: 'alert', recovery: { strategy } })).toBe(true);
  });

  it('is false when recovery is manual', () => {
    expect(isRecoveryEnabled({ kind: 'alert', recovery: { strategy: 'manual' } })).toBe(false);
  });

  it('is false for signal rules', () => {
    expect(isRecoveryEnabled({ kind: 'signal', recovery: { strategy: 'no_breach' } })).toBe(false);
  });
});

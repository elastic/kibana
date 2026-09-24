/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { getEsqlDataView } from '@kbn/discover-utils';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { FindRulesResponse } from '@kbn/alerting-v2-schemas';
import { useAlertingRuleSourceDataViews } from './use_alerting_rule_source_data_views';

jest.mock('@kbn/discover-utils');

const mockGetEsqlDataView = jest.mocked(getEsqlDataView);

const http = httpServiceMock.createStartContract();
const { dataViews } = dataPluginMock.createStartContract();

type Rule = FindRulesResponse['items'][number];

const buildRule = (query: string): Rule =>
  ({ query: { format: 'standalone', breach: { query } } } as unknown as Rule);

describe('useAlertingRuleSourceDataViews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEsqlDataView.mockImplementation(
      async ({ esql }) => ({ id: esql } as unknown as DataView)
    );
  });

  it('resolves a source data view per rule, keyed by rule id', async () => {
    const rules = {
      'rule-a': buildRule('FROM logs-a'),
      'rule-b': buildRule('FROM logs-b'),
    };

    const { result } = renderHook(() => useAlertingRuleSourceDataViews({ rules, dataViews, http }));

    await waitFor(() => expect(result.current.size).toBe(2));

    expect(result.current.get('rule-a')).toEqual({ id: 'FROM logs-a' });
    expect(result.current.get('rule-b')).toEqual({ id: 'FROM logs-b' });
  });

  it('resolves each unique query only once when rules share a query', async () => {
    const rules = {
      'rule-a': buildRule('FROM logs'),
      'rule-b': buildRule('FROM logs'),
      'rule-c': buildRule('FROM other'),
    };

    const { result } = renderHook(() => useAlertingRuleSourceDataViews({ rules, dataViews, http }));

    await waitFor(() => expect(result.current.size).toBe(3));

    expect(mockGetEsqlDataView).toHaveBeenCalledTimes(2);
    expect(result.current.get('rule-a')).toBe(result.current.get('rule-b'));
  });

  it('skips rules without a query and rules whose data view fails to resolve', async () => {
    mockGetEsqlDataView.mockImplementation(async ({ esql }) => {
      if (esql === 'FROM broken') {
        throw new Error('boom');
      }
      return { id: esql } as unknown as DataView;
    });

    const rules = {
      'rule-ok': buildRule('FROM logs'),
      'rule-broken': buildRule('FROM broken'),
      'rule-no-query': {} as unknown as Rule,
    };

    const { result } = renderHook(() => useAlertingRuleSourceDataViews({ rules, dataViews, http }));

    await waitFor(() => expect(result.current.get('rule-ok')).toBeDefined());

    expect(result.current.has('rule-broken')).toBe(false);
    expect(result.current.has('rule-no-query')).toBe(false);
    expect(result.current.size).toBe(1);
  });
});

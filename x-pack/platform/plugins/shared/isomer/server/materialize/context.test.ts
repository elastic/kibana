/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import { ESQLVariableType } from '@kbn/esql-types';
import { mergeContext } from './context';

const filter = (value: string): Filter => ({
  meta: { key: 'host.name' },
  query: { match_phrase: { 'host.name': value } },
});

const parent = {
  timeRange: { from: 'now-15m', to: 'now' },
  query: { language: 'kuery', query: 'service.name: checkout' },
  filters: [filter('web-01')],
  esqlVariables: [{ key: 'field', value: 'host.name', type: ESQLVariableType.FIELDS }],
  timeZone: 'Europe/Paris',
  locale: 'fr-FR',
};

describe('mergeContext', () => {
  it('returns the parent without an override', () => {
    expect(mergeContext(parent)).toBe(parent);
  });

  it("adds the override's filters to the parent's", () => {
    expect(mergeContext(parent, { filters: [filter('web-02')] }).filters).toEqual([
      filter('web-01'),
      filter('web-02'),
    ]);
  });

  it("puts the override's other fields in place of the parent's", () => {
    const override = {
      timeRange: { from: '2026-01-01T00:00:00.000Z', to: '2026-01-02T00:00:00.000Z' },
      query: { language: 'lucene', query: 'status:500' },
      esqlVariables: [{ key: 'field', value: 'service.name', type: ESQLVariableType.FIELDS }],
      timeZone: 'UTC',
      locale: 'en',
    };
    expect(mergeContext(parent, override)).toEqual({ ...override, filters: parent.filters });
  });

  it("drops the parent's filters and query when the override ignores global filters", () => {
    expect(
      mergeContext(parent, { ignoreGlobalFilters: true, filters: [filter('web-02')] })
    ).toEqual({
      timeRange: parent.timeRange,
      filters: [filter('web-02')],
      esqlVariables: parent.esqlVariables,
      timeZone: parent.timeZone,
      locale: parent.locale,
    });
    expect(mergeContext(parent, { ignoreGlobalFilters: true })).not.toHaveProperty('filters');
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decode as risonDecode } from '@kbn/rison';
import {
  buildAlertsPageUrl,
  buildAttacksPageUrl,
  buildEntityAnalyticsPageUrl,
  buildRulesPageUrl,
} from './build_security_urls';

/** Parses the query string from a URL returned by a builder, decoding rison values. */
const parseParams = (url: string): Record<string, unknown> => {
  const idx = url.indexOf('?');
  if (idx === -1) return {};
  const qs = url.slice(idx + 1);
  const raw = new URLSearchParams(qs);
  const result: Record<string, unknown> = {};
  for (const [key, value] of raw.entries()) {
    try {
      result[key] = risonDecode(value);
    } catch {
      result[key] = value;
    }
  }
  return result;
};

const getSecurityAppUrl = (path: string) => `/app/security${path}`;

describe('buildAlertsPageUrl', () => {
  const alertIds = ['id1', 'id2'];
  const createdAt = '2026-09-20T12:00:00.000Z';
  const updatedAt = '2026-09-24T12:00:00.000Z';

  it('returns undefined for empty alertIds', () => {
    expect(buildAlertsPageUrl(getSecurityAppUrl, [], createdAt, updatedAt)).toBeUndefined();
  });

  it('starts with the alerts path', () => {
    const url = buildAlertsPageUrl(getSecurityAppUrl, alertIds, createdAt, updatedAt)!;
    expect(url.startsWith('/app/security/alerts?')).toBe(true);
  });

  it('builds a phrases filter (pill) on _id for multiple ids', () => {
    const url = buildAlertsPageUrl(getSecurityAppUrl, alertIds, createdAt, updatedAt)!;
    const params = parseParams(url) as Record<
      string,
      Array<{ meta: { type: string; key: string; params: string[] } }>
    >;
    expect(Array.isArray(params.filters)).toBe(true);
    const idFilter = params.filters[0];
    expect(idFilter.meta.type).toBe('phrases');
    expect(idFilter.meta.key).toBe('_id');
    expect(idFilter.meta.params).toEqual(['id1', 'id2']);
  });

  it('builds a phrase filter (pill) on _id for a single id', () => {
    const url = buildAlertsPageUrl(getSecurityAppUrl, ['single-id'], createdAt, updatedAt)!;
    const params = parseParams(url) as Record<
      string,
      Array<{ meta: { type: string; key: string; params: { query: string } } }>
    >;
    const idFilter = params.filters[0];
    expect(idFilter.meta.type).toBe('phrase');
    expect(idFilter.meta.key).toBe('_id');
    expect(idFilter.meta.params).toEqual({ query: 'single-id' });
  });

  it('does not set a KQL query param (ids are in filters, not the search bar)', () => {
    const url = buildAlertsPageUrl(getSecurityAppUrl, alertIds, createdAt, updatedAt)!;
    const params = parseParams(url);
    expect(params.query).toBeUndefined();
  });

  it('sets an absolute timerange from 7 days before createdAt', () => {
    const url = buildAlertsPageUrl(getSecurityAppUrl, alertIds, createdAt, updatedAt)!;
    const params = parseParams(url) as Record<
      string,
      { global: { timerange: { from: string; kind: string; to: string } } }
    >;
    const from = new Date(params.timerange.global.timerange.from);
    const expectedFrom = new Date(new Date(createdAt).getTime() - 7 * 24 * 60 * 60 * 1000);
    expect(from.getTime()).toBe(expectedFrom.getTime());
    expect(params.timerange.global.timerange.kind).toBe('absolute');
  });

  it('sets pageFilters with an empty status selected_options', () => {
    const url = buildAlertsPageUrl(getSecurityAppUrl, alertIds, createdAt, updatedAt)!;
    const params = parseParams(url) as Record<
      string,
      Array<{ field_name: string; selected_options: string[] }>
    >;
    const statusFilter = (
      params.pageFilters as Array<{ field_name: string; selected_options: string[] }>
    ).find((f) => f.field_name === 'kibana.alert.workflow_status');
    expect(statusFilter).toBeDefined();
    expect(statusFilter!.selected_options).toEqual([]);
  });
});

describe('buildAttacksPageUrl', () => {
  const attackIds = ['atk1', 'atk2'];
  const createdAt = '2026-09-20T12:00:00.000Z';
  const updatedAt = '2026-09-24T12:00:00.000Z';

  it('returns undefined for empty attackIds', () => {
    expect(buildAttacksPageUrl(getSecurityAppUrl, [], createdAt, updatedAt)).toBeUndefined();
  });

  it('starts with the attacks path', () => {
    const url = buildAttacksPageUrl(getSecurityAppUrl, attackIds, createdAt, updatedAt)!;
    expect(url.startsWith('/app/security/attacks?')).toBe(true);
  });

  it('applies the same phrases filter pattern as alerts', () => {
    const url = buildAttacksPageUrl(getSecurityAppUrl, attackIds, createdAt, updatedAt)!;
    const params = parseParams(url) as Record<
      string,
      Array<{ meta: { type: string; key: string; params: string[] } }>
    >;
    const idFilter = params.filters[0];
    expect(idFilter.meta.type).toBe('phrases');
    expect(idFilter.meta.key).toBe('_id');
    expect(idFilter.meta.params).toEqual(['atk1', 'atk2']);
  });

  it('does not set a KQL query param', () => {
    const url = buildAttacksPageUrl(getSecurityAppUrl, attackIds, createdAt, updatedAt)!;
    const params = parseParams(url);
    expect(params.query).toBeUndefined();
  });
});

describe('buildEntityAnalyticsPageUrl', () => {
  it('returns undefined for empty entity terms', () => {
    expect(buildEntityAnalyticsPageUrl(getSecurityAppUrl, [])).toBeUndefined();
  });

  it('starts with the entity analytics path', () => {
    const url = buildEntityAnalyticsPageUrl(getSecurityAppUrl, ['user:alice@corp'])!;
    expect(url.startsWith('/app/security/entity_analytics_home_page?')).toBe(true);
  });

  it('puts entity terms into cspq query', () => {
    const url = buildEntityAnalyticsPageUrl(getSecurityAppUrl, ['user:alice@corp', 'web-01'])!;
    const params = parseParams(url) as Record<string, { query: { query: string } }>;
    expect(params.cspq.query.query).toContain('user:alice@corp');
    expect(params.cspq.query.query).toContain('web-01');
  });
});

describe('buildRulesPageUrl', () => {
  it('links to /rules/management for multiple rules', () => {
    const url = buildRulesPageUrl(getSecurityAppUrl, 3, 'rule-origin-1');
    expect(url).toBe('/app/security/rules/management');
  });

  it('links to /rules/management when single rule but no origin', () => {
    const url = buildRulesPageUrl(getSecurityAppUrl, 1, undefined);
    expect(url).toBe('/app/security/rules/management');
  });

  it('links to the rule detail overview page for a single rule with an origin', () => {
    const origin = '956914a4-ddba-45db-aa23-01cf9c22f772';
    const url = buildRulesPageUrl(getSecurityAppUrl, 1, origin);
    expect(url).toBe(`/app/security/rules/id/${origin}/overview`);
  });

  it('URL-encodes the origin id', () => {
    const url = buildRulesPageUrl(getSecurityAppUrl, 1, 'id with spaces');
    expect(url).toBe('/app/security/rules/id/id%20with%20spaces/overview');
  });
});

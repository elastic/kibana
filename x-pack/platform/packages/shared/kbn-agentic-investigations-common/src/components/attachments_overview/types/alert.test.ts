/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decode as risonDecode } from '@kbn/rison';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { getAlertRow } from './alert';

const makeAttachment = (
  type: string,
  data: unknown,
  overrides: Partial<VersionedAttachment> = {}
): VersionedAttachment => ({
  id: `${type}-${Math.random()}`,
  type,
  versions: [{ version: 1, data, created_at: '2026-09-20T12:00:00.000Z', content_hash: 'a' }],
  current_version: 1,
  active: true,
  ...overrides,
});

const getUrl = (path: string) => `/app/security${path}`;
const ALERT_INDEX = '.alerts-security.alerts-default-000001';

const parseParams = (url: string): Record<string, unknown> => {
  const idx = url.indexOf('?');
  if (idx === -1) return {};
  const raw = new URLSearchParams(url.slice(idx + 1));
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

describe('getAlertRow — security.alert', () => {
  it('returns undefined for no attachments', () => {
    expect(getAlertRow([], getUrl)).toBeUndefined();
  });

  it('extracts _id when _index and _id are plain strings', () => {
    const data = { alert: JSON.stringify({ _id: 'abc123', _index: ALERT_INDEX }) };
    const row = getAlertRow([makeAttachment('security.alert', data)], getUrl);
    expect(row?.href).toContain('/alerts?');
    expect(row?.label).toContain('1 alert');
  });

  it('extracts _id when both are arrays (flyout / getRawData path)', () => {
    const data = { alert: JSON.stringify({ _id: ['def456'], _index: [ALERT_INDEX] }) };
    const row = getAlertRow([makeAttachment('security.alert', data)], getUrl);
    expect(row).toBeDefined();
    expect(row?.label).toContain('1 alert');
  });

  it('skips attachments whose _index is not a security alert index', () => {
    const data = {
      alert: JSON.stringify({ _id: 'event1', _index: 'logs-endpoint.events.process-default' }),
    };
    expect(getAlertRow([makeAttachment('security.alert', data)], getUrl)).toBeUndefined();
  });

  it('skips when data.alert is prose (agent-created)', () => {
    const data = { alert: 'This is a prose description of the alert' };
    expect(getAlertRow([makeAttachment('security.alert', data)], getUrl)).toBeUndefined();
  });

  it('deduplicates the same alert attached twice', () => {
    const data = { alert: JSON.stringify({ _id: 'dup', _index: ALERT_INDEX }) };
    const row = getAlertRow(
      [makeAttachment('security.alert', data), makeAttachment('security.alert', data)],
      getUrl
    );
    expect(row?.label).toContain('1 alert');
  });

  it('ignores inactive attachments', () => {
    const data = { alert: JSON.stringify({ _id: 'id1', _index: ALERT_INDEX }) };
    expect(
      getAlertRow([makeAttachment('security.alert', data, { active: false })], getUrl)
    ).toBeUndefined();
  });

  it('ignores hidden attachments', () => {
    const data = { alert: JSON.stringify({ _id: 'id1', _index: ALERT_INDEX }) };
    expect(
      getAlertRow([makeAttachment('security.alert', data, { hidden: true })], getUrl)
    ).toBeUndefined();
  });
});

describe('getAlertRow — security.alerts', () => {
  it('extracts all ids from alertIds array', () => {
    const data = { alertIds: ['id1', 'id2', 'id3'] };
    const row = getAlertRow([makeAttachment('security.alerts', data)], getUrl);
    expect(row?.label).toContain('3 alerts');
  });

  it('merges ids from security.alert and security.alerts and deduplicates', () => {
    const singleAlertData = { alert: JSON.stringify({ _id: 'shared', _index: ALERT_INDEX }) };
    const batchData = { alertIds: ['shared', 'unique'] };
    const row = getAlertRow(
      [
        makeAttachment('security.alert', singleAlertData),
        makeAttachment('security.alerts', batchData),
      ],
      getUrl
    );
    expect(row?.label).toContain('2 alerts');
  });
});

describe('getAlertRow — URL params', () => {
  const alertIds = ['id1', 'id2'];
  const makeAlerts = (ids: string[], ts = '2026-09-20T12:00:00.000Z') => {
    const a = makeAttachment('security.alerts', { alertIds: ids });
    a.versions[0].created_at = ts;
    return a;
  };

  it('builds a phrases filter (pill) on _id for multiple ids', () => {
    const row = getAlertRow([makeAlerts(alertIds)], getUrl)!;
    const params = parseParams(row.href) as Record<
      string,
      Array<{ meta: { type: string; key: string; params: string[] } }>
    >;
    expect(params.filters[0].meta.type).toBe('phrases');
    expect(params.filters[0].meta.key).toBe('_id');
    expect(params.filters[0].meta.params).toEqual(['id1', 'id2']);
  });

  it('builds a phrase filter (pill) on _id for a single id', () => {
    const row = getAlertRow([makeAlerts(['single-id'])], getUrl)!;
    const params = parseParams(row.href) as Record<
      string,
      Array<{ meta: { type: string; params: { query: string } } }>
    >;
    expect(params.filters[0].meta.type).toBe('phrase');
    expect(params.filters[0].meta.params).toEqual({ query: 'single-id' });
  });

  it('does not set a KQL query param (ids are in filters, not the search bar)', () => {
    const row = getAlertRow([makeAlerts(alertIds)], getUrl)!;
    expect(parseParams(row.href).query).toBeUndefined();
  });

  it('sets an absolute timerange from 7 days before createdAt', () => {
    const createdAt = '2026-09-20T12:00:00.000Z';
    const row = getAlertRow([makeAlerts(alertIds, createdAt)], getUrl)!;
    const params = parseParams(row.href) as Record<
      string,
      { global: { timerange: { from: string; kind: string } } }
    >;
    const from = new Date(params.timerange.global.timerange.from);
    const expectedFrom = new Date(new Date(createdAt).getTime() - 7 * 24 * 60 * 60 * 1000);
    expect(from.getTime()).toBe(expectedFrom.getTime());
    expect(params.timerange.global.timerange.kind).toBe('absolute');
  });

  it('sets pageFilters with an empty status selected_options', () => {
    const row = getAlertRow([makeAlerts(alertIds)], getUrl)!;
    const params = parseParams(row.href) as Record<
      string,
      Array<{ field_name: string; selected_options: string[] }>
    >;
    const statusFilter = params.pageFilters.find(
      (f) => f.field_name === 'kibana.alert.workflow_status'
    );
    expect(statusFilter?.selected_options).toEqual([]);
  });

  it('sets alertsCreatedAt to the earliest first-version created_at', () => {
    const earlier = makeAlerts(['a'], '2026-09-10T00:00:00.000Z');
    const later = makeAlerts(['b'], '2026-09-20T00:00:00.000Z');
    const row = getAlertRow([later, earlier], getUrl)!;
    const params = parseParams(row.href) as Record<
      string,
      { global: { timerange: { from: string } } }
    >;
    const from = new Date(params.timerange.global.timerange.from);
    const expected = new Date(
      new Date('2026-09-10T00:00:00.000Z').getTime() - 7 * 24 * 60 * 60 * 1000
    );
    expect(from.getTime()).toBe(expected.getTime());
  });

  it('uses the latest version created_at for the upper bound when attachment is updated', () => {
    const a = makeAttachment('security.alerts', { alertIds: ['id1'] });
    a.versions = [
      {
        version: 1,
        data: { alertIds: ['id1'] },
        created_at: '2026-09-10T00:00:00.000Z',
        content_hash: 'a',
      },
      {
        version: 2,
        data: { alertIds: ['id1'] },
        created_at: '2026-09-25T00:00:00.000Z',
        content_hash: 'b',
      },
    ];
    a.current_version = 2;
    const row = getAlertRow([a], getUrl)!;
    const params = parseParams(row.href) as Record<
      string,
      { global: { timerange: { to: string } } }
    >;
    const to = new Date(params.timerange.global.timerange.to);
    const expectedTo = new Date(new Date('2026-09-25T00:00:00.000Z').getTime() + 60 * 1000);
    expect(to.getTime()).toBe(expectedTo.getTime());
  });
});

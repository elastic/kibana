/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { convertDashboard } from './convert';
import { readPinnedControls } from './dashboard_context';
import { parseSavedObjectNdjson } from './kibana/from-saved-object/ndjson';
import type { EsqlResponse } from './esql_response';

const ndjson = readFileSync(join(__dirname, '../fixtures/web_logs_sample.ndjson'), 'utf8');
const LOGS = 'edf84fe0-e1a0-11e7-b6d5-4dc382ef7f5b';

// Every column the query names, one row of 1s: enough for each binder to build its node.
const executeEsql = async (esql: string): Promise<EsqlResponse> => {
  const names = [...esql.matchAll(/(?:^|[,|]\s*|BY\s+|STATS\s+)`?([A-Za-z_@][\w.@]*)`?\s*=/gm)].map(
    ([, name]) => name
  );
  return {
    columns: names.map((name) => ({ name, type: 'long' })),
    values: [names.map(() => 1)],
  };
};

const panelCount = (): number => {
  const dashboard = ndjson
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line))
    .find(({ type, id }) => type === 'dashboard' && id === LOGS);
  return JSON.parse(dashboard.attributes.panelsJSON).length;
};

describe('convertDashboard', () => {
  it('returns every panel in order with its grid box, binding Markdown and tables', async () => {
    const converted = await convertDashboard({
      ndjson,
      dashboardId: LOGS,
      now: Date.parse('2026-10-20T00:00:00Z'),
      executeEsql,
      search: async () => ({ hits: { hits: [] }, aggregations: {} }),
    });
    expect(converted.title).toBe('[Logs] Web Traffic');
    expect(converted.panels).toHaveLength(panelCount());
    for (const panel of converted.panels) {
      expect(panel.grid).toEqual({
        x: expect.any(Number),
        y: expect.any(Number),
        w: expect.any(Number),
        h: expect.any(Number),
      });
      if (panel.node) {
        expect(panel.outcome.status).toBe('converted');
        expect(panel.node.id).toBe(panel.panelId);
      }
    }
    const kinds = converted.panels.map(({ kind, outcome }) => `${kind}:${outcome.status}`);
    expect(kinds).toContain('markdown:converted');
    expect(converted.panels.find(({ kind }) => kind === 'markdown')?.node).toMatchObject({
      type: 'markdown',
      text: expect.stringContaining(''),
    });
  });
});

describe('convertDashboard with controls', () => {
  it('sends the on-screen control selection with every query, and Vega searches, as Kibana does', async () => {
    const dashboard = parseSavedObjectNdjson(ndjson).find(
      ({ type, id }) => type === 'dashboard' && id === LOGS
    )!;
    const [optionsList] = readPinnedControls(
      dashboard.attributes as Record<string, unknown>,
      (dashboard as { references?: never[] }).references ?? []
    ).filter(({ type }) => type === 'options_list_control');
    expect(optionsList).toBeDefined();
    const filters: unknown[] = [];
    const searches: unknown[] = [];
    const converted = await convertDashboard({
      ndjson,
      dashboardId: LOGS,
      now: Date.parse('2026-10-20T00:00:00Z'),
      executeEsql: async (esql, options) => {
        filters.push(options?.filter);
        return executeEsql(esql);
      },
      search: async (_index, body) => {
        searches.push(body);
        return { hits: { hits: [] }, aggregations: {} };
      },
      controls: [{ ...optionsList, config: { ...optionsList.config, selected_options: ['IN'] } }],
      resolveField: async (dataViewId, name) => ({
        dataView: { id: dataViewId, title: 'kibana_sample_data_logs', fields: [] },
        field: { name, type: 'string' },
      }),
    });
    const phrase = { match_phrase: { [String(optionsList.config.field_name)]: 'IN' } };
    expect(converted.diagnostics).toEqual([]);
    expect(filters.length).toBeGreaterThan(0);
    for (const filter of filters.filter(Boolean)) {
      expect(JSON.stringify(filter)).toContain(JSON.stringify(phrase));
    }
    expect(searches.some((body) => JSON.stringify(body).includes(JSON.stringify(phrase)))).toBe(
      true
    );
  });
});

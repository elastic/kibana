/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

import type { SavedObjectEnvelope } from '../ndjson';
import { fromKibanaDashboardSavedObject } from './from_dashboard_saved_object';

const lensEnvelope = JSON.parse(
  readFileSync(join(__dirname, '../../__fixtures__/lens_metric.json'), 'utf8')
) as SavedObjectEnvelope;

const searchEnvelope: SavedObjectEnvelope = {
  id: 'session-1',
  type: 'search',
  attributes: {
    title: 'Recent orders',
    columns: ['customer', 'total'],
    sort: [['@timestamp', 'desc']],
    kibanaSavedObjectMeta: {
      searchSourceJSON: JSON.stringify({
        index: 'orders-*',
        query: { query: '', language: 'kuery' },
        filter: [],
      }),
    },
  },
  references: [],
};

const markdownEnvelope: SavedObjectEnvelope = {
  id: 'md-1',
  type: 'markdown',
  attributes: { title: 'Notes', content: '# From the library' },
  references: [],
};

const linksEnvelope: SavedObjectEnvelope = {
  id: 'links-1',
  type: 'links',
  attributes: {
    title: 'Related',
    links: [{ id: 'a', type: 'externalLink', destination: 'https://example.com', label: 'Docs' }],
  },
  references: [],
};

const envelopes = new Map(
  [lensEnvelope, searchEnvelope, markdownEnvelope, linksEnvelope].map((envelope) => [
    `${envelope.type}:${envelope.id}`,
    envelope,
  ])
);

const grid = (y: number) => ({ x: 0, y, w: 24, h: 8 });

/** A dashboard as Kibana 9.4 saves it: renamed panel types, and by-reference panels named `<id>:savedObjectRef`. */
const dashboard: SavedObjectEnvelope = {
  id: 'dash-94',
  type: 'dashboard',
  attributes: {
    title: 'Saved on 9.4',
    panelsJSON: JSON.stringify([
      {
        type: 'vis',
        panelIndex: 'p-lens',
        gridData: { ...grid(0), i: 'p-lens' },
        embeddableConfig: {},
      },
      {
        type: 'discover_session',
        panelIndex: 'p-search',
        gridData: { ...grid(1), i: 'p-search' },
        embeddableConfig: {},
      },
      {
        type: 'markdown',
        panelIndex: 'p-md-ref',
        gridData: { ...grid(2), i: 'p-md-ref' },
        embeddableConfig: {},
      },
      {
        type: 'markdown',
        panelIndex: 'p-md-value',
        gridData: { ...grid(3), i: 'p-md-value' },
        embeddableConfig: { content: '**inline**', title: 'Inline notes', hide_title: true },
      },
      {
        type: 'vega',
        panelIndex: 'p-vega',
        gridData: { ...grid(4), i: 'p-vega' },
        embeddableConfig: {
          spec: {
            format: 'hjson',
            value: '{\n  $schema: https://vega.github.io/schema/vega-lite/v5.json\n  mark: bar\n}',
          },
        },
      },
      {
        type: 'legacy_vis',
        panelIndex: 'p-legacy-md',
        gridData: { ...grid(5), i: 'p-legacy-md' },
        embeddableConfig: {
          savedVis: { type: 'markdown', title: 'Legacy', params: { markdown: 'legacy body' } },
        },
      },
      {
        type: 'links',
        panelIndex: 'p-links',
        gridData: { ...grid(6), i: 'p-links' },
        embeddableConfig: {},
      },
    ]),
  },
  references: [
    { name: 'p-lens:savedObjectRef', type: 'lens', id: lensEnvelope.id },
    { name: 'p-search:savedObjectRef', type: 'search', id: 'session-1' },
    { name: 'p-md-ref:savedObjectRef', type: 'markdown', id: 'md-1' },
    { name: 'p-links:savedObjectRef', type: 'links', id: 'links-1' },
  ],
};

describe('fromKibanaDashboardSavedObject on a dashboard saved by Kibana 9.4', () => {
  const { dashboard: lowered, diagnostics } = fromKibanaDashboardSavedObject(dashboard, {
    resolvePanelEnvelope: ({ type, id }) => envelopes.get(`${type}:${id}`),
  });

  it('lowers every panel', () => {
    expect(lowered?.panels.map((panel) => panel.type)).toEqual([
      'lens',
      'savedSearch',
      'markdown',
      'markdown',
      'vega',
      'markdown',
      'links',
    ]);
    expect(
      diagnostics
        .map(({ code }) => code)
        .filter(
          (code) => code.startsWith('dashboard.unknown') || code.startsWith('dashboard.panel')
        )
    ).toEqual([]);
  });

  it('resolves by-reference panels through <panel id>:savedObjectRef', () => {
    const [lens, search, markdown] = lowered?.panels ?? [];
    expect(lens?.type === 'lens' && lens.lens.title).toBe('Orders (24h)');
    expect(search?.type === 'savedSearch' && search.query.esql).toContain('FROM orders-*');
    expect(markdown?.type === 'markdown' && markdown.body).toBe('# From the library');
  });

  it('reads the Markdown and Vega embeddables by value', () => {
    const [, , , markdown, vega] = lowered?.panels ?? [];
    expect(markdown).toEqual({ type: 'markdown', body: '**inline**' });
    expect(vega?.type === 'vega' && vega.mode).toBe('vega-lite');
    expect(vega?.type === 'vega' && vega.spec.mark).toBe('bar');
  });
});

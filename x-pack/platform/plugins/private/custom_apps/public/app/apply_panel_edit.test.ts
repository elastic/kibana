/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { A2uiMessage } from '@kbn/a2ui-renderer';
import type { CustomAppDefinition } from '../../common/app_definition';
import { applyPanelEdit } from './apply_panel_edit';

const message = (text: string) =>
  ({
    version: 'v1.0',
    createSurface: { surfaceId: 'chart', components: [{ id: 'root', component: 'Text', text }] },
  } as A2uiMessage);

const definition = (): CustomAppDefinition =>
  ({
    version: 1,
    title: 'App',
    layout: {},
    panels: {
      chart: { title: 'Chart', tab: 'Overview', hideBorder: true },
      other: { title: 'Other', tab: 'Logs' },
    },
    surfaces: { chart: [message('before')], other: [message('other')] },
    queries: {
      chart: [{ path: '/a', shape: 'rows', query: 'FROM x | SORT a, b' }],
      other: [{ path: '/b', shape: 'rows', query: 'FROM y | SORT a, b' }],
    },
  } as unknown as CustomAppDefinition);

describe('applyPanelEdit', () => {
  it("writes the panel's components and queries back", () => {
    const next = applyPanelEdit(definition(), 'chart', {
      title: 'Chart',
      messages: [message('after')],
      queries: [{ path: '/a', shape: 'rows', query: 'FROM x | SORT c, d' }],
    });

    expect(JSON.stringify(next.surfaces.chart)).toContain('after');
    expect(next.queries?.chart?.[0].query).toBe('FROM x | SORT c, d');
  });

  it('keeps panel settings the editor does not expose', () => {
    // The flyout edits the title only, so replacing the entry wholesale would
    // move the panel out of its tab and give a borderless panel a frame back.
    const next = applyPanelEdit(definition(), 'chart', {
      title: 'Renamed',
      messages: [message('after')],
      queries: [],
    });

    expect(next.panels.chart).toEqual({ title: 'Renamed', tab: 'Overview', hideBorder: true });
  });

  it('leaves every other panel untouched', () => {
    const before = definition();
    const next = applyPanelEdit(before, 'chart', {
      title: 'Chart',
      messages: [message('after')],
      queries: [],
    });

    expect(next.panels.other).toEqual(before.panels.other);
    expect(next.surfaces.other).toEqual(before.surfaces.other);
    expect(next.queries?.other).toEqual(before.queries?.other);
  });

  it('drops the queries key when a panel is left with none', () => {
    const next = applyPanelEdit(definition(), 'chart', {
      title: 'Chart',
      messages: [message('after')],
      queries: [],
    });

    expect(next.queries).not.toHaveProperty('chart');
    expect(next.queries).toHaveProperty('other');
  });

  it('adds queries to a panel that had none', () => {
    const base = definition();
    delete base.queries?.chart;

    const next = applyPanelEdit(base, 'chart', {
      title: 'Chart',
      messages: [message('after')],
      queries: [{ path: '/new', shape: 'first', query: 'FROM z' }],
    });

    expect(next.queries?.chart).toEqual([{ path: '/new', shape: 'first', query: 'FROM z' }]);
  });
});

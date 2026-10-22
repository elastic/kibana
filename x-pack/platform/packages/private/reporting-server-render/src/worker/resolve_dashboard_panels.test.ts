/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolveDashboardPanelLayout } from './resolve_dashboard_panels';
import type { LoopbackHttpClient } from '../services/loopback_http_client';

describe('resolveDashboardPanelLayout', () => {
  const makeClient = (response: unknown): LoopbackHttpClient =>
    ({ fetchJson: jest.fn().mockResolvedValue(response) } as unknown as LoopbackHttpClient);

  it('parses panelsJSON into DashboardPanelLayout entries, in saved-object order', async () => {
    const client = makeClient({
      attributes: {
        title: 'My dashboard',
        panelsJSON: JSON.stringify([
          { panelIndex: '1', gridData: { x: 0, y: 0, w: 24, h: 10, i: '1' }, title: 'Panel one' },
          { panelIndex: '2', gridData: { x: 24, y: 0, w: 24, h: 10, i: '2' } },
        ]),
      },
    });

    const result = await resolveDashboardPanelLayout(client, 'dash-id');

    expect(result.title).toBe('My dashboard');
    expect(result.panels).toEqual([
      { panelIndex: '1', title: 'Panel one', gridData: { x: 0, y: 0, w: 24, h: 10, i: '1' } },
      { panelIndex: '2', title: undefined, gridData: { x: 24, y: 0, w: 24, h: 10, i: '2' } },
    ]);
    expect(client.fetchJson).toHaveBeenCalledWith('/api/saved_objects/dashboard/dash-id');
  });

  it(
    "sorts panels into reading order (grid y then x), not the saved object's raw " +
      "panelsJSON array order (confirmed live: a real dashboard whose 'map' panel is " +
      'panelsJSON[0] but sits visually several rows down rendered its [data-shared-item] ' +
      'element 7th in the DOM, not 1st -- every index-based correlation downstream of this ' +
      'function silently matched the wrong panel to the wrong element/exclusion until this ' +
      'sort was added)',
    async () => {
      const client = makeClient({
        attributes: {
          panelsJSON: JSON.stringify([
            // Saved out of reading order: this entry is first in the array but sits in the
            // second row, second column.
            { panelIndex: 'second-visually', gridData: { x: 24, y: 10, w: 24, h: 10, i: 'b' } },
            { panelIndex: 'first-visually', gridData: { x: 0, y: 0, w: 24, h: 10, i: 'a' } },
            { panelIndex: 'third-visually', gridData: { x: 0, y: 10, w: 24, h: 10, i: 'c' } },
          ]),
        },
      });

      const { panels } = await resolveDashboardPanelLayout(client, 'dash-id');

      expect(panels.map((p) => p.panelIndex)).toEqual([
        'first-visually',
        'third-visually',
        'second-visually',
      ]);
    }
  );

  it(
    "resolves a panel's savedObjectId from a reference named " +
      '`${panelIndex}:${panelRefName}` -- not the bare `panelRefName` (confirmed live: a real ' +
      "dashboard's references array names a map panel's reference '4:panel_4', not 'panel_4', " +
      "for the panel whose panelIndex is '4' and panelRefName is 'panel_4' -- the " +
      'per-panel prefix is what lets two different panels each use the same bare ' +
      "panelRefName, e.g. 'panel_0', without colliding)",
    async () => {
      const client = makeClient({
        attributes: {
          panelsJSON: JSON.stringify([
            {
              panelIndex: '4',
              gridData: { x: 0, y: 0, w: 24, h: 10, i: '4' },
              type: 'map',
              panelRefName: 'panel_4',
            },
          ]),
        },
        references: [{ name: '4:panel_4', type: 'map', id: 'the-map-saved-object-id' }],
      });

      const { panels } = await resolveDashboardPanelLayout(client, 'dash-id');

      expect(panels[0].savedObjectId).toBe('the-map-saved-object-id');
    }
  );

  it('falls back to gridData.i when a panel entry has no panelIndex', async () => {
    const client = makeClient({
      attributes: {
        panelsJSON: JSON.stringify([{ gridData: { x: 0, y: 0, w: 48, h: 10, i: 'only-i' } }]),
      },
    });

    const { panels } = await resolveDashboardPanelLayout(client, 'dash-id');
    expect(panels[0].panelIndex).toBe('only-i');
  });

  it('throws a descriptive error when panelsJSON is not valid JSON', async () => {
    const client = makeClient({ attributes: { panelsJSON: '{not json' } });
    await expect(resolveDashboardPanelLayout(client, 'dash-id')).rejects.toThrow(
      /Could not parse panelsJSON for dashboard "dash-id"/
    );
  });

  it('URL-encodes the dashboard id in the request path', async () => {
    const client = makeClient({ attributes: { panelsJSON: '[]' } });
    await resolveDashboardPanelLayout(client, 'a/b c');
    expect(client.fetchJson).toHaveBeenCalledWith('/api/saved_objects/dashboard/a%2Fb%20c');
  });
});

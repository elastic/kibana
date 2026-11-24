/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import { VISUALIZE_EMBEDDABLE_TYPE } from '@kbn/visualizations-common';
import { buildVegaSavedVis, VEGA_VIS_TYPE } from '@kbn/agent-builder-visualizations-common';
import type { DashboardAttachmentData } from '../types';
import { attachmentDataToDashboardState } from './from_attachment';
import { dashboardStateToAttachmentData } from './to_attachment';

const SPEC = JSON.stringify(
  { $schema: 'https://vega.github.io/schema/vega-lite/v6.json', mark: 'bar' },
  null,
  2
);
const MINIFIED_SPEC = '{"$schema":"https://vega.github.io/schema/vega-lite/v6.json","mark":"bar"}';
const grid = { x: 0, y: 0, w: 24, h: 15 };

const panelSettings = {
  title: 'Panel title edited',
  description: 'Panel description edited',
  hide_title: true,
  hide_border: true,
  drilldowns: [{ id: 'd1' }],
};

describe('Vega dashboard panel conversion', () => {
  it.each([
    ['json', { format: 'json', value: JSON.parse(SPEC) }],
    ['hjson', { format: 'hjson', value: '{\n  // bars\n  mark: bar\n}' }],
  ])('round-trips a native `vega` panel with a %s spec unchanged', (_format, spec) => {
    const panel = {
      type: VEGA_VIS_TYPE,
      id: 'p1',
      grid,
      config: {
        ...panelSettings,
        query: { language: 'kql', expression: 'host.name: "a"' },
        filters: [{ condition: { field: 'host.name', operator: 'is', value: 'a' } }],
        spec,
      },
    };
    const attachmentData = { title: 'Dash', panels: [panel] } as unknown as DashboardAttachmentData;

    const dashboardState = attachmentDataToDashboardState(attachmentData);

    expect(dashboardState.panels).toEqual([panel]);
    expect(dashboardStateToAttachmentData(dashboardState).panels).toEqual([panel]);
  });

  it('from_attachment reads the string spec of a `vega` panel saved before native panels as HJSON', () => {
    const attachmentData = {
      title: 'Dash',
      panels: [{ type: VEGA_VIS_TYPE, id: 'p1', grid, config: { spec: SPEC, title: 'Chart' } }],
    } as unknown as DashboardAttachmentData;

    expect(attachmentDataToDashboardState(attachmentData).panels).toEqual([
      {
        type: VEGA_VIS_TYPE,
        id: 'p1',
        grid,
        config: { spec: { format: 'hjson', value: SPEC }, title: 'Chart' },
      },
    ]);
  });

  it('to_attachment reads a by-value legacy-vis Vega panel as a native `vega` panel, re-indenting a compact spec', () => {
    const state = {
      panels: [
        {
          type: VISUALIZE_EMBEDDABLE_TYPE,
          id: 'p1',
          grid,
          config: {
            savedVis: buildVegaSavedVis({
              spec: MINIFIED_SPEC,
              title: 'Chart',
              description: 'Desc',
            }),
          },
        },
      ],
    } as unknown as DashboardState;

    const attachmentData = dashboardStateToAttachmentData(state);

    expect(attachmentData.panels).toEqual([
      {
        type: VEGA_VIS_TYPE,
        id: 'p1',
        grid,
        config: { spec: { format: 'hjson', value: SPEC }, title: 'Chart', description: 'Desc' },
      },
    ]);
  });

  it('to_attachment preserves panel-level settings (title, description, hide_*, drilldowns) over savedVis values', () => {
    const state = {
      panels: [
        {
          type: VISUALIZE_EMBEDDABLE_TYPE,
          id: 'p1',
          grid,
          config: {
            ...panelSettings,
            savedVis: buildVegaSavedVis({
              spec: MINIFIED_SPEC,
              title: 'Original savedVis title',
              description: 'Original savedVis description',
            }),
          },
        },
      ],
    } as unknown as DashboardState;

    const attachmentData = dashboardStateToAttachmentData(state);

    expect(attachmentData.panels).toEqual([
      {
        type: VEGA_VIS_TYPE,
        id: 'p1',
        grid,
        config: { ...panelSettings, spec: { format: 'hjson', value: SPEC } },
      },
    ]);
  });
});

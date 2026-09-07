/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { VEGA_VIS_TYPE } from '@kbn/agent-builder-visualizations-common';
import {
  editPanelRequestInputSchema,
  editVisPanelConfigInputSchema,
  panelRequestSchema,
  visPanelDefinition,
} from '.';

const baseCreateRequest = {
  source: 'request' as const,
  type: 'vis' as const,
  query: 'show total requests',
  grid: { x: 0, y: 0, w: 12, h: 5 },
};

describe('visualization panel request schemas', () => {
  it('requires chartType when creating a Lens panel', () => {
    expect(
      panelRequestSchema.safeParse({
        ...baseCreateRequest,
        chartType: SupportedChartType.Metric,
      }).success
    ).toBe(true);

    expect(panelRequestSchema.safeParse(baseCreateRequest).success).toBe(false);
  });

  it('allows a Vega panel without a chartType hint', () => {
    expect(
      panelRequestSchema.safeParse({
        ...baseCreateRequest,
        renderer: 'vega',
      }).success
    ).toBe(true);
  });

  it('allows an edit without chartType because the existing panel provides context', () => {
    expect(
      editPanelRequestInputSchema.safeParse({
        source: 'request',
        type: 'vis',
        panelId: 'panel-1',
        query: 'use a clearer title',
      }).success
    ).toBe(true);
  });
});

describe('visualization presentation edits', () => {
  const baseEdit = { source: 'config', type: 'vis', panelId: 'panel-1' };
  const panel = {
    id: 'panel-1',
    type: LENS_EMBEDDABLE_TYPE,
    config: {
      type: 'xy',
      layers: [
        {
          type: 'line',
          data_source: { type: 'esql', query: 'ROW count=1' },
          y: [{ column: 'count' }],
        },
      ],
    },
    grid: { x: 0, y: 0, w: 24, h: 10 },
  };

  it('accepts explicit supported changes without filling other settings', () => {
    const config = { changes: [{ operation: 'set', path: 'axis.x.title.visible', value: false }] };
    expect(editVisPanelConfigInputSchema.safeParse({ ...baseEdit, config }).success).toBe(true);
    expect(visPanelDefinition.applyConfigEdit?.(panel, config)).toEqual({
      ...panel.config,
      axis: { x: { title: { visible: false } } },
    });
  });

  it.each([
    {},
    { defaults: ['axes'] },
    { defaults: ['axes'], changes: [{ operation: 'set', path: 'title', value: 'Title' }] },
    { type: 'pie' },
    { visualization: { legend: { isVisible: false } } },
    { layers: [] },
    { spec: 'invalid' },
  ])('rejects arbitrary config patches: %j', (config) => {
    expect(editVisPanelConfigInputSchema.safeParse({ ...baseEdit, config }).success).toBe(false);
  });

  it('restricts Vega to panel chrome', () => {
    const vega = { ...panel, type: VEGA_VIS_TYPE, config: { spec: '{"mark":"line"}' } };
    expect(
      visPanelDefinition.applyConfigEdit?.(vega, {
        changes: [{ operation: 'set', path: 'title', value: 'Requests' }],
      })
    ).toEqual({ spec: vega.config.spec, title: 'Requests' });
    expect(() =>
      visPanelDefinition.applyConfigEdit?.(vega, {
        changes: [{ operation: 'set', path: 'spec', value: 'invalid' }],
      })
    ).toThrow();
  });

  it('rejects a non-visualization panel', () => {
    expect(visPanelDefinition.validateConfigEdit?.({ ...panel, type: 'markdown' })?.ok).toBe(false);
  });
});

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

describe('editVisPanelConfigInputSchema', () => {
  const baseEdit = {
    source: 'config' as const,
    type: 'vis' as const,
    panelId: 'panel-1',
  };

  it('accepts a title-only presentation patch', () => {
    expect(
      editVisPanelConfigInputSchema.safeParse({
        ...baseEdit,
        config: { title: '' },
      }).success
    ).toBe(true);
  });

  it('accepts a nested visualization styling patch', () => {
    expect(
      editVisPanelConfigInputSchema.safeParse({
        ...baseEdit,
        config: { visualization: { legend: { isVisible: false } } },
      }).success
    ).toBe(true);
  });

  it('rejects an empty config patch', () => {
    expect(
      editVisPanelConfigInputSchema.safeParse({
        ...baseEdit,
        config: {},
      }).success
    ).toBe(false);
  });

  it('rejects an attachment-shaped config', () => {
    expect(
      editVisPanelConfigInputSchema.safeParse({
        ...baseEdit,
        config: {
          visualization: { type: 'metric' },
          esql: 'FROM logs | STATS count = COUNT(*)',
          chart_type: 'metric',
        },
      }).success
    ).toBe(false);
  });

  it.each(['datasourceStates', 'query', 'filters'] as const)(
    'rejects a top-level %s data-path patch',
    (key) => {
      expect(
        editVisPanelConfigInputSchema.safeParse({
          ...baseEdit,
          config: { [key]: {} },
        }).success
      ).toBe(false);
    }
  );
});

describe('visPanelDefinition config edits', () => {
  const lensPanel = {
    id: 'panel-1',
    type: LENS_EMBEDDABLE_TYPE,
    config: { type: 'xy', title: 'Errors', visualization: { layers: [{ id: 'layer-1' }] } },
    grid: { x: 0, y: 0, w: 24, h: 10 },
  };

  const vegaPanel = {
    id: 'vega-1',
    type: VEGA_VIS_TYPE,
    config: { spec: '{"mark":"line"}', title: 'Requests' },
    grid: { x: 0, y: 0, w: 24, h: 10 },
  };

  it('accepts a config edit of a Lens panel', () => {
    expect(visPanelDefinition.validateConfigEdit?.(lensPanel, { title: '' })).toEqual({ ok: true });
  });

  it('accepts a config edit of a Vega panel', () => {
    expect(visPanelDefinition.validateConfigEdit?.(vegaPanel, { title: 'New' })).toEqual({
      ok: true,
    });
  });

  it('rejects a config edit of a non-visualization panel', () => {
    const result = visPanelDefinition.validateConfigEdit?.(
      { ...lensPanel, type: 'markdown' },
      { title: '' }
    );

    expect(result?.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toMatch(/panel-1.*markdown/);
  });

  it('rejects a Vega spec patch on a Lens panel', () => {
    const result = visPanelDefinition.validateConfigEdit?.(lensPanel, { spec: '{"mark":"bar"}' });

    expect(result?.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toMatch(/Lens/);
  });

  it('rejects a Lens type patch on a Vega panel', () => {
    const result = visPanelDefinition.validateConfigEdit?.(vegaPanel, { type: 'xy' });

    expect(result?.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toMatch(/Vega/);
  });

  it('deep-merges a visualization patch onto the existing config', () => {
    expect(
      visPanelDefinition.applyConfigEdit?.(lensPanel, {
        title: '',
        visualization: { legend: { isVisible: false } },
      })
    ).toEqual({
      type: 'xy',
      title: '',
      visualization: { layers: [{ id: 'layer-1' }], legend: { isVisible: false } },
    });
  });
});

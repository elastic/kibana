/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardPanel } from '@kbn/dashboard-plugin/server';
import type { AttachmentPanel } from '../types';
import {
  convertVegaPanelToLegacyVisPanel,
  convertLegacyVisPanelToVegaPanel,
  isLegacyVisVegaPanel,
  isVegaAttachmentPanel,
  VEGA_PANEL_TYPE,
} from './vega_to_legacy_vis';

describe('vega_to_legacy_vis converter', () => {
  const grid = { x: 0, y: 0, w: 24, h: 15 };

  const vegaPanel: AttachmentPanel = {
    id: 'panel-1',
    type: VEGA_PANEL_TYPE,
    grid,
    config: {
      title: 'Event counts',
      description: 'counts over time',
      spec: '{"$schema":"https://vega.github.io/schema/vega-lite/v5.json","mark":"line"}',
    },
  };

  it('detects vega attachment panels', () => {
    expect(isVegaAttachmentPanel(vegaPanel)).toBe(true);
    expect(isVegaAttachmentPanel({ ...vegaPanel, type: 'lens' })).toBe(false);
  });

  it('converts a vega panel to a by-value legacy visualize panel', () => {
    expect(convertVegaPanelToLegacyVisPanel(vegaPanel)).toEqual({
      type: 'legacy_vis',
      id: 'panel-1',
      grid,
      config: {
        savedVis: {
          title: 'Event counts',
          description: 'counts over time',
          type: 'vega',
          params: {
            spec: '{"$schema":"https://vega.github.io/schema/vega-lite/v5.json","mark":"line"}',
          },
          uiState: {},
          data: { aggs: [], searchSource: {} },
        },
        title: 'Event counts',
        description: 'counts over time',
      },
    });
  });

  it('defaults the saved vis title when none is provided', () => {
    const panel: AttachmentPanel = {
      id: 'panel-2',
      type: VEGA_PANEL_TYPE,
      grid,
      config: { spec: '{"mark":"bar"}' },
    };

    const converted = convertVegaPanelToLegacyVisPanel(panel);

    expect(converted.config).toEqual({
      savedVis: {
        title: '',
        type: 'vega',
        params: { spec: '{"mark":"bar"}' },
        uiState: {},
        data: { aggs: [], searchSource: {} },
      },
    });
  });

  it('detects a Vega panel stored as a legacy visualize panel', () => {
    const legacyVisVegaPanel = convertVegaPanelToLegacyVisPanel(vegaPanel) as DashboardPanel;

    expect(isLegacyVisVegaPanel(legacyVisVegaPanel)).toBe(true);
    expect(isLegacyVisVegaPanel({ type: 'legacy_vis', config: {} })).toBe(false);
    expect(
      isLegacyVisVegaPanel({ type: 'legacy_vis', config: { savedVis: { type: 'markdown' } } })
    ).toBe(false);
    expect(isLegacyVisVegaPanel({ type: 'lens', config: {} })).toBe(false);
  });

  it('round-trips a Vega panel back to the canonical vega shape', () => {
    const legacyVisVegaPanel = convertVegaPanelToLegacyVisPanel(vegaPanel) as DashboardPanel;

    expect(convertLegacyVisPanelToVegaPanel(legacyVisVegaPanel)).toEqual(vegaPanel);
  });

  it('recovers the spec from a legacy Vega saved object missing top-level title/description', () => {
    const legacyVisVegaPanel: DashboardPanel = {
      id: 'panel-3',
      type: 'legacy_vis',
      grid,
      config: {
        savedVis: {
          title: 'From saved vis',
          type: 'vega',
          params: { spec: '{"mark":"point"}' },
        },
      },
    } as unknown as DashboardPanel;

    expect(convertLegacyVisPanelToVegaPanel(legacyVisVegaPanel)).toEqual({
      type: VEGA_PANEL_TYPE,
      id: 'panel-3',
      grid,
      config: {
        title: 'From saved vis',
        spec: '{"mark":"point"}',
      },
    });
  });
});

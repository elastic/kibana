/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentPanel } from '../types';
import {
  convertVegaPanelToLegacyVisPanel,
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
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { LensConfigBuilder, type LensApiConfig } from '@kbn/lens-embeddable-utils';
import { VISUALIZE_EMBEDDABLE_TYPE } from '@kbn/visualizations-common';
import { buildVegaSavedVis, VEGA_VIS_TYPE } from '@kbn/agent-builder-visualizations-common';
import type { DashboardAttachmentData } from '../types';
import {
  attachmentDataToDashboardState,
  attachmentDataToSavedDashboardState,
} from './from_attachment';

const grid = { x: 0, y: 0, w: 24, h: 15 };
const SPEC = '{"mark":"bar"}';

const lensChartConfig = {
  type: 'metric',
  data_source: { type: 'esql', query: 'FROM logs | STATS count = COUNT(*)' },
  metrics: [{ type: 'primary', column: 'count' }],
  sampling: 1,
  ignore_global_filters: false,
};
const lensApiConfig = { ...lensChartConfig, title: 'Count', hide_border: true };

const lensPanel = { type: LENS_EMBEDDABLE_TYPE, id: 'lens-1', grid, config: lensApiConfig };
const vegaPanel = {
  type: VEGA_VIS_TYPE,
  id: 'vega-1',
  grid,
  config: { spec: SPEC, title: 'Chart', description: 'Desc' },
};
const expandedVegaPanel = {
  type: VISUALIZE_EMBEDDABLE_TYPE,
  id: 'vega-1',
  grid,
  config: {
    title: 'Chart',
    description: 'Desc',
    savedVis: buildVegaSavedVis({ spec: SPEC, title: 'Chart', description: 'Desc' }),
  },
};

const attachmentData = {
  title: 'Dash',
  panels: [
    lensPanel,
    vegaPanel,
    {
      id: 'section-1',
      title: 'Section',
      collapsed: false,
      grid: { y: 20 },
      panels: [{ ...lensPanel, id: 'lens-2' }],
    },
  ],
} as unknown as DashboardAttachmentData;

const withPanels = (panels: unknown[]) =>
  ({ title: 'Dash', panels } as unknown as DashboardAttachmentData);

describe('attachmentDataToSavedDashboardState', () => {
  describe('when the Dashboard app takes Lens API format', () => {
    const toSavedState = (data: DashboardAttachmentData) =>
      attachmentDataToSavedDashboardState(data, { lensApiFormat: true });

    it('passes Lens API configs through unchanged, without internal attributes', () => {
      const [panel] = toSavedState(attachmentData).panels;

      expect(panel).toEqual(lensPanel);
    });

    it('expands vega panels to by-value visualization panels', () => {
      const [, panel] = toSavedState(attachmentData).panels;

      expect(panel).toEqual(expandedVegaPanel);
    });

    it('keeps section panels in API format', () => {
      const [, , section] = toSavedState(attachmentData).panels;

      expect(section).toEqual({
        id: 'section-1',
        title: 'Section',
        collapsed: false,
        grid: { y: 20 },
        panels: [{ ...lensPanel, id: 'lens-2' }],
      });
    });

    it('matches the browser state outside panels, where only Lens panels gain attributes', () => {
      const { panels: browserPanels, ...browserRest } =
        attachmentDataToDashboardState(attachmentData);
      const { panels: savedPanels, ...savedRest } = toSavedState(attachmentData);

      expect(savedRest).toEqual(browserRest);
      expect(browserPanels[0]).toEqual({
        ...lensPanel,
        config: { ...lensApiConfig, attributes: expect.any(Object) },
      });
      expect(browserPanels[1]).toEqual(savedPanels[1]);
    });
  });

  describe('when the Dashboard app takes stored Lens state', () => {
    const toSavedState = (data: DashboardAttachmentData) =>
      attachmentDataToSavedDashboardState(data, { lensApiFormat: false });
    const storedLensConfig = {
      title: 'Count',
      hide_border: true,
      attributes: new LensConfigBuilder().fromAPIFormat(lensChartConfig as LensApiConfig),
    };

    it('splits Lens API configs into panel settings and Lens attributes', () => {
      const [panel] = toSavedState(attachmentData).panels;

      expect(panel).toEqual({ ...lensPanel, config: storedLensConfig });
    });

    it('converts Lens panels inside sections', () => {
      const [, , section] = toSavedState(attachmentData).panels;

      expect(section).toEqual({
        id: 'section-1',
        title: 'Section',
        collapsed: false,
        grid: { y: 20 },
        panels: [{ ...lensPanel, id: 'lens-2', config: storedLensConfig }],
      });
    });

    it('passes by-reference and stored Lens configs through unchanged', () => {
      const byRefPanel = { ...lensPanel, id: 'by-ref', config: { ref_id: 'lens-so', title: 'A' } };
      const storedPanel = { ...lensPanel, id: 'stored', config: storedLensConfig };

      expect(toSavedState(withPanels([byRefPanel, storedPanel])).panels).toEqual([
        byRefPanel,
        storedPanel,
      ]);
    });

    it('still expands vega panels to by-value visualization panels', () => {
      const [, panel] = toSavedState(attachmentData).panels;

      expect(panel).toEqual(expandedVegaPanel);
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachmentData } from '../types';
import { OPAQUE_PANEL_LIMITS, dashboardAttachmentDataSchema } from '../types';
import { attachmentDataToDashboardState } from './from_attachment';

const dashboardWithByRefPanel: DashboardAttachmentData = {
  title: 'Web traffic',
  panels: [
    {
      type: 'legacy_vis',
      id: 'vega',
      config: { savedObjectId: 'vis-1' },
      grid: { x: 0, y: 0, w: 24, h: 10 },
    },
  ],
  _derived: {
    opaque_panels: [
      { panel_id: 'vega', saved_object_id: 'vis-1', resolved: true, chart_type: 'vega' },
    ],
  },
};

describe('attachmentDataToDashboardState', () => {
  it('leaves derived agent context out of the dashboard state', () => {
    expect(attachmentDataToDashboardState(dashboardWithByRefPanel)).not.toHaveProperty('_derived');
  });
});

describe('dashboardAttachmentDataSchema', () => {
  it('accepts derived agent context', () => {
    expect(dashboardAttachmentDataSchema.safeParse(dashboardWithByRefPanel).success).toBe(true);
  });

  it('rejects an opaque panel query longer than the text limit', () => {
    const result = dashboardAttachmentDataSchema.safeParse({
      ...dashboardWithByRefPanel,
      _derived: {
        opaque_panels: [
          {
            panel_id: 'vega',
            saved_object_id: 'vis-1',
            resolved: true,
            query: 'x'.repeat(OPAQUE_PANEL_LIMITS.textLength + 1),
          },
        ],
      },
    });

    expect(result.success).toBe(false);
  });

  it('rejects more opaque panel summaries than the entry limit', () => {
    const entry = { panel_id: 'vega', saved_object_id: 'vis-1', resolved: true };
    const result = dashboardAttachmentDataSchema.safeParse({
      ...dashboardWithByRefPanel,
      _derived: { opaque_panels: Array(OPAQUE_PANEL_LIMITS.entries + 1).fill(entry) },
    });

    expect(result.success).toBe(false);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { generateDashboardTool, summarizeDashboard } from './generate_dashboard_tool';

describe('generateDashboardTool', () => {
  describe('schema', () => {
    const schema = generateDashboardTool().schema;

    it('allows config-only prettification', () => {
      expect(
        schema.safeParse({
          operations: [],
          prettifyPanelConfigs: true,
        }).success
      ).toBe(true);
    });

    it('requires an operation or config prettification', () => {
      expect(schema.safeParse({ operations: [] }).success).toBe(false);
      expect(schema.safeParse({}).success).toBe(false);
    });
  });

  it('projects panels without their config and attaches authoring notes by panel id', () => {
    const dashboardData: DashboardAttachmentData = {
      title: 'Service overview',
      description: 'Production traffic',
      panels: [
        {
          id: 'requests',
          type: LENS_EMBEDDABLE_TYPE,
          config: {
            title: 'Request volume',
            type: 'metric',
            data_source: {
              type: 'esql',
              query: 'FROM logs-* | STATS requests = COUNT(*)',
            },
            metric: { metric: 'requests' },
          },
          grid: { x: 0, y: 0, w: 12, h: 8 },
        },
        {
          id: 'untouched',
          type: LENS_EMBEDDABLE_TYPE,
          config: { title: 'Errors', type: 'metric' },
          grid: { x: 12, y: 0, w: 12, h: 8 },
        },
      ],
    };

    expect(
      summarizeDashboard(dashboardData, new Map([['requests', 'Right-aligned the metric value.']]))
    ).toEqual({
      title: 'Service overview',
      description: 'Production traffic',
      panels: [
        {
          id: 'requests',
          type: LENS_EMBEDDABLE_TYPE,
          grid: { x: 0, y: 0, w: 12, h: 8 },
          authoring_note: 'Right-aligned the metric value.',
        },
        {
          id: 'untouched',
          type: LENS_EMBEDDABLE_TYPE,
          grid: { x: 12, y: 0, w: 12, h: 8 },
          authoring_note: undefined,
        },
      ],
      controls: [],
    });
  });
});

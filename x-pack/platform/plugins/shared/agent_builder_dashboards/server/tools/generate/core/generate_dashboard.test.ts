/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { generateDashboard } from './generate_dashboard';

const createLogger = (): Logger =>
  ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger);

describe('generateDashboard', () => {
  it('generates a new dashboard payload from operations', async () => {
    const { dashboardData, failures } = await generateDashboard({
      operations: [
        { operation: 'set_metadata', title: 'Sales', description: 'Q1 sales' },
        {
          operation: 'add_panels',
          panels: [
            { kind: 'markdown', markdownContent: '# Hello', grid: { x: 0, y: 0, w: 12, h: 4 } },
          ],
        },
      ],
      logger: createLogger(),
    });

    expect(failures).toEqual([]);
    expect(dashboardData.title).toBe('Sales');
    expect(dashboardData.description).toBe('Q1 sales');
    expect(dashboardData.panels).toHaveLength(1);
  });

  it('updates a prior dashboard payload', async () => {
    const previousDashboardData: DashboardAttachmentData = {
      title: 'Existing',
      description: undefined,
      panels: [],
    };

    const { dashboardData } = await generateDashboard({
      previousDashboardData,
      operations: [{ operation: 'set_metadata', description: 'updated' }],
      logger: createLogger(),
    });

    expect(dashboardData.title).toBe('Existing');
    expect(dashboardData.description).toBe('updated');
  });
});

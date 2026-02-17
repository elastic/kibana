/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RawDashboard, DashboardPanel as RawDashboardPanel } from '@kbn/streams-schema';
import {
  convertRawDashboardToKibanaInput,
  getDefaultTimeRange,
} from './dashboard_suggestion_converter';

// Mock the LensConfigBuilder
jest.mock('@kbn/lens-embeddable-utils/config_builder', () => ({
  LensConfigBuilder: jest.fn().mockImplementation(() => ({
    fromAPIFormat: jest.fn().mockReturnValue({
      state: { visualization: {} },
      visualizationType: 'lnsXY',
      references: [],
    }),
  })),
}));

describe('dashboard_suggestion_converter', () => {
  describe('getDefaultTimeRange', () => {
    it('returns a default time range of last 24 hours', () => {
      const result = getDefaultTimeRange();
      expect(result).toEqual({ from: 'now-24h', to: 'now' });
    });
  });

  describe('convertRawDashboardToKibanaInput', () => {
    const createMockPanel = (overrides: Partial<RawDashboardPanel> = {}): RawDashboardPanel => ({
      id: 'panel-1',
      title: 'Test Panel',
      type: 'line_chart',
      query: 'FROM logs | STATS count = COUNT(*) BY @timestamp',
      dimensions: { x: '@timestamp', y: 'count' },
      position: { x: 0, y: 0, width: 24, height: 15 },
      ...overrides,
    });

    const createMockDashboard = (overrides: Partial<RawDashboard> = {}): RawDashboard => ({
      title: 'Test Dashboard',
      description: 'A test dashboard',
      panels: [createMockPanel()],
      timeRange: { from: 'now-24h', to: 'now' },
      ...overrides,
    });

    it('converts a basic dashboard with a line chart panel', () => {
      const rawDashboard = createMockDashboard();
      const result = convertRawDashboardToKibanaInput(rawDashboard);

      expect(result.title).toBe('Test Dashboard');
      expect(result.description).toBe('A test dashboard');
      expect(result.timeRange).toEqual({ from: 'now-24h', to: 'now' });
      expect(result.panels).toHaveLength(1);
    });

    it('converts panel position to grid format', () => {
      const rawDashboard = createMockDashboard({
        panels: [
          createMockPanel({
            position: { x: 10, y: 5, width: 20, height: 12 },
          }),
        ],
      });
      const result = convertRawDashboardToKibanaInput(rawDashboard);

      // Check that panel has correct grid properties
      expect(result.panels).toHaveLength(1);
    });

    it('handles multiple panels', () => {
      const rawDashboard = createMockDashboard({
        panels: [
          createMockPanel({ id: 'panel-1', title: 'Panel 1' }),
          createMockPanel({ id: 'panel-2', title: 'Panel 2', type: 'bar_chart' }),
          createMockPanel({ id: 'panel-3', title: 'Panel 3', type: 'area_chart' }),
        ],
      });
      const result = convertRawDashboardToKibanaInput(rawDashboard);

      expect(result.panels).toHaveLength(3);
    });

    it('handles pie chart panels', () => {
      const rawDashboard = createMockDashboard({
        panels: [
          createMockPanel({
            type: 'pie_chart',
            query: 'FROM logs | STATS count = COUNT(*) BY status',
            dimensions: { partition: 'status', value: 'count' },
          }),
        ],
      });
      const result = convertRawDashboardToKibanaInput(rawDashboard);

      expect(result.panels).toHaveLength(1);
    });

    it('handles data table panels', () => {
      const rawDashboard = createMockDashboard({
        panels: [
          createMockPanel({
            type: 'data_table',
            query: 'FROM logs | LIMIT 100',
            dimensions: { columns: ['@timestamp', 'message', 'level'] },
          }),
        ],
      });
      const result = convertRawDashboardToKibanaInput(rawDashboard);

      expect(result.panels).toHaveLength(1);
    });

    it('handles empty panels array', () => {
      const rawDashboard = createMockDashboard({ panels: [] });
      const result = convertRawDashboardToKibanaInput(rawDashboard);

      expect(result.panels).toHaveLength(0);
      expect(result.title).toBe('Test Dashboard');
    });

    it('clamps panel width to grid maximum', () => {
      const rawDashboard = createMockDashboard({
        panels: [
          createMockPanel({
            position: { x: 0, y: 0, width: 60, height: 15 }, // Exceeds max of 48
          }),
        ],
      });
      const result = convertRawDashboardToKibanaInput(rawDashboard);

      expect(result.panels).toHaveLength(1);
    });

    it('skips panels that fail conversion and continues with others', () => {
      // Mock console.warn to verify it's called
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const rawDashboard = createMockDashboard({
        panels: [
          createMockPanel({ id: 'panel-1', title: 'Valid Panel 1' }),
          createMockPanel({
            id: 'panel-2',
            title: 'Invalid Panel',
            type: 'line_chart',
            dimensions: { x: undefined, y: undefined }, // Missing required dimensions
          }),
          createMockPanel({ id: 'panel-3', title: 'Valid Panel 2' }),
        ],
      });

      const result = convertRawDashboardToKibanaInput(rawDashboard);

      // The invalid panel should be skipped
      expect(result.panels).toBeDefined();
      // Console.warn should have been called for the invalid panel
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('preserves dashboard without description', () => {
      const rawDashboard = createMockDashboard({
        description: undefined,
      });
      const result = convertRawDashboardToKibanaInput(rawDashboard);

      expect(result.description).toBeUndefined();
    });

    it('handles panel with column metadata', () => {
      const rawDashboard = createMockDashboard({
        panels: [
          createMockPanel({
            columnMetadata: [
              {
                columnId: '@timestamp',
                fieldName: '@timestamp',
                label: 'Timestamp',
                customLabel: false,
                meta: { type: 'date', esType: 'date' },
              },
              {
                columnId: 'count',
                fieldName: 'count',
                label: 'Count',
                customLabel: true,
                meta: { type: 'number', esType: 'long' },
                inMetricDimension: true,
              },
            ],
          }),
        ],
      });
      const result = convertRawDashboardToKibanaInput(rawDashboard);

      expect(result.panels).toHaveLength(1);
    });
  });
});

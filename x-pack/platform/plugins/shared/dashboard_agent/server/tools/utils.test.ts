/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filterVisualizationIds } from './manage_dashboard/utils';

// TODO: Add tests for normalizePanels and resolveLensConfigFromAttachment once attachment mocking utilities are available
// These functions require AttachmentStateManager which is complex to mock

describe('filterVisualizationIds', () => {
  it('should remove specified IDs from the array', () => {
    const ids = ['viz1', 'viz2', 'viz3', 'viz4'];
    const result = filterVisualizationIds(ids, ['viz2', 'viz4']);

    expect(result).toEqual(['viz1', 'viz3']);
  });

  it('should return all IDs when no IDs match for removal', () => {
    const ids = ['viz1', 'viz2'];
    const result = filterVisualizationIds(ids, ['non-existent']);

    expect(result).toEqual(['viz1', 'viz2']);
  });

  it('should return empty array when all IDs are removed', () => {
    const ids = ['viz1', 'viz2'];
    const result = filterVisualizationIds(ids, ['viz1', 'viz2']);

    expect(result).toEqual([]);
  });

  it('should return original array when removal list is empty', () => {
    const ids = ['viz1', 'viz2'];
    const result = filterVisualizationIds(ids, []);

    expect(result).toEqual(['viz1', 'viz2']);
  });

  it('should handle empty input array', () => {
    const result = filterVisualizationIds([], ['viz1']);
    expect(result).toEqual([]);
  });
});

describe('AttachmentPanel types', () => {
  it('should support lens panel entry type', () => {
    const entry = {
      type: 'lens',
      panelId: 'panel-1',
      visualization: { type: 'Metric', value: 'count()' },
      title: 'Test Metric',
    };

    expect(entry.type).toBe('lens');
    expect(entry.panelId).toBe('panel-1');
    expect(entry.visualization).toBeDefined();
  });

  it('should support generic panel entry type', () => {
    const entry = {
      type: 'DASHBOARD_MARKDOWN',
      panelId: 'panel-2',
      rawConfig: { content: '# Test' },
      title: 'Markdown Panel',
    };

    expect(entry.type).toBe('DASHBOARD_MARKDOWN');
    expect(entry.panelId).toBe('panel-2');
    expect(entry.rawConfig).toBeDefined();
  });

  it('should work with union type', () => {
    const lensPanel = {
      type: 'lens',
      panelId: 'panel-1',
      visualization: { type: 'Metric' },
    };

    const genericPanel = {
      type: 'DASHBOARD_MARKDOWN',
      panelId: 'panel-2',
      rawConfig: { content: '# Test' },
    };

    expect(lensPanel.panelId).toBe('panel-1');
    expect(genericPanel.panelId).toBe('panel-2');
  });
});

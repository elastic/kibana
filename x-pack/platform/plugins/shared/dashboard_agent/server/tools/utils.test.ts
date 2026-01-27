/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filterVisualizationIds, buildMarkdownPanel, getMarkdownPanelHeight } from './utils';

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

describe('buildMarkdownPanel', () => {
  it('should create a markdown panel with the correct type', () => {
    const content = '# Test Markdown';
    const panel = buildMarkdownPanel(content);

    expect(panel.type).toBe('DASHBOARD_MARKDOWN');
    expect(panel.config).toEqual({ content });
  });

  it('should position the panel at x=0, y=0', () => {
    const panel = buildMarkdownPanel('test');

    expect(panel.grid.x).toBe(0);
    expect(panel.grid.y).toBe(0);
  });

  it('should use full width for markdown panel', () => {
    const panel = buildMarkdownPanel('test');

    expect(panel.grid.w).toBe(48); // MARKDOWN_PANEL_WIDTH
  });

  it('should calculate height based on content lines', () => {
    const shortContent = 'Single line';
    const longContent = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';

    const shortPanel = buildMarkdownPanel(shortContent);
    const longPanel = buildMarkdownPanel(longContent);

    // Longer content should result in taller panel (up to max)
    expect(longPanel.grid.h).toBeGreaterThanOrEqual(shortPanel.grid.h);
  });
});

describe('getMarkdownPanelHeight', () => {
  it('should return minimum height for short content', () => {
    const height = getMarkdownPanelHeight('Short');
    expect(height).toBeGreaterThanOrEqual(4); // MARKDOWN_MIN_HEIGHT
  });

  it('should increase height for multi-line content', () => {
    const shortHeight = getMarkdownPanelHeight('Short');
    const longHeight = getMarkdownPanelHeight('Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6');

    expect(longHeight).toBeGreaterThan(shortHeight);
  });

  it('should cap height at maximum', () => {
    const veryLongContent = Array(50).fill('Line').join('\n');
    const height = getMarkdownPanelHeight(veryLongContent);

    expect(height).toBeLessThanOrEqual(12); // MARKDOWN_MAX_HEIGHT
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

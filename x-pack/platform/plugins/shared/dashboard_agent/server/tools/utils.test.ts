/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolResultStore } from '@kbn/agent-builder-server';
import { ToolResultType } from '@kbn/agent-builder-common';
import type { LensApiSchemaType } from '@kbn/lens-embeddable-utils/config_builder';
import type { DashboardPanel } from '@kbn/dashboard-plugin/server';
import {
  resolveLensConfig,
  generatePanelUid,
  assignPanelUids,
  findPanelByUid,
  removePanelsByUids,
} from './utils';

const createMockResultStore = (
  results: Map<string, { type: string; data: Record<string, unknown> }>
): ToolResultStore => ({
  has: (id: string) => results.has(id),
  get: (id: string) => results.get(id) as ReturnType<ToolResultStore['get']>,
});

describe('resolveLensConfig', () => {
  // Minimal valid config for testing
  const validLensConfig = {
    type: 'metric',
    title: 'Test Metric',
    dataset: { type: 'esql', query: 'FROM test' },
    metric: { operation: 'count' },
  } as unknown as LensApiSchemaType;

  describe('when panel is a direct config object', () => {
    it('should return the config when panel is a valid Lens API config', () => {
      const result = resolveLensConfig(validLensConfig);
      expect(result).toEqual(validLensConfig);
    });

    it.each([
      ['null', null],
      ['undefined', undefined],
      ['a number', 42],
      ['an object without type', { title: 'No type' }],
    ])('should throw when panel is %s', (_, invalidPanel) => {
      expect(() => resolveLensConfig(invalidPanel)).toThrow(
        'Invalid panel configuration. Expected a Lens API config object with a "type" property.'
      );
    });
  });

  describe('when panel is a string reference', () => {
    it('should throw when string is not a valid tool result id format', () => {
      expect(() => resolveLensConfig('invalid-id')).toThrow(
        'Invalid panel reference "invalid-id". Expected a tool_result_id from a previous visualization tool call.'
      );
    });

    it('should throw when resultStore is not provided', () => {
      expect(() => resolveLensConfig('abc123')).toThrow(
        'Panel reference "abc123" was not found in the tool result store.'
      );
    });

    it('should throw when panel reference is not found in resultStore', () => {
      const resultStore = createMockResultStore(new Map());
      expect(() => resolveLensConfig('abc123', resultStore)).toThrow(
        'Panel reference "abc123" was not found in the tool result store.'
      );
    });

    it('should throw when referenced result is not a visualization type', () => {
      const results = new Map([
        ['abc123', { type: ToolResultType.other, data: { someData: true } }],
      ]);
      const resultStore = createMockResultStore(results);

      expect(() => resolveLensConfig('abc123', resultStore)).toThrow(
        'Provided tool_result_id "abc123" is not a visualization result (got "other").'
      );
    });

    it('should throw when visualization result has no visualization config', () => {
      const results = new Map([['abc123', { type: ToolResultType.visualization, data: {} }]]);
      const resultStore = createMockResultStore(results);

      expect(() => resolveLensConfig('abc123', resultStore)).toThrow(
        'Visualization result "abc123" does not contain a valid visualization config.'
      );
    });

    it('should throw when visualization config is not an object', () => {
      const results = new Map([
        [
          'abc123',
          { type: ToolResultType.visualization, data: { visualization: 'not-an-object' } },
        ],
      ]);
      const resultStore = createMockResultStore(results);

      expect(() => resolveLensConfig('abc123', resultStore)).toThrow(
        'Visualization result "abc123" does not contain a valid visualization config.'
      );
    });

    it('should return the visualization config when valid', () => {
      const results = new Map([
        [
          'abc123',
          { type: ToolResultType.visualization, data: { visualization: validLensConfig } },
        ],
      ]);
      const resultStore = createMockResultStore(results);

      const result = resolveLensConfig('abc123', resultStore);
      expect(result).toEqual(validLensConfig);
    });
  });
});

describe('generatePanelUid', () => {
  it('should generate a unique panel UID using UUID v4 format', () => {
    const uid1 = generatePanelUid();
    const uid2 = generatePanelUid();

    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(uid1).toMatch(uuidV4Regex);
    expect(uid2).toMatch(uuidV4Regex);
    expect(uid1).not.toEqual(uid2);
  });
});

describe('assignPanelUids', () => {
  const createMockPanel = (overrides: Partial<DashboardPanel> = {}): DashboardPanel => ({
    type: 'lens',
    grid: { x: 0, y: 0, w: 12, h: 9 },
    config: {},
    ...overrides,
  });

  it('should assign UIDs to panels without UIDs', () => {
    const panels = [createMockPanel(), createMockPanel()];
    const result = assignPanelUids(panels);

    expect(result).toHaveLength(2);
    expect(result[0].uid).toBeDefined();
    expect(result[1].uid).toBeDefined();
    expect(result[0].uid).not.toEqual(result[1].uid);
  });

  it('should preserve existing UIDs', () => {
    const panels = [createMockPanel({ uid: 'existing-uid-1' }), createMockPanel()];
    const result = assignPanelUids(panels);

    expect(result[0].uid).toEqual('existing-uid-1');
    expect(result[1].uid).toBeDefined();
    expect(result[1].uid).not.toEqual('existing-uid-1');
  });

  it('should return empty array when given empty array', () => {
    const result = assignPanelUids([]);
    expect(result).toEqual([]);
  });
});

describe('findPanelByUid', () => {
  const createMockPanel = (uid: string): DashboardPanel => ({
    type: 'lens',
    grid: { x: 0, y: 0, w: 12, h: 9 },
    config: {},
    uid,
  });

  it('should find a panel by its UID', () => {
    const panels = [createMockPanel('uid-1'), createMockPanel('uid-2'), createMockPanel('uid-3')];
    const result = findPanelByUid(panels, 'uid-2');

    expect(result).toBeDefined();
    expect(result?.uid).toEqual('uid-2');
  });

  it('should return undefined when panel is not found', () => {
    const panels = [createMockPanel('uid-1'), createMockPanel('uid-2')];
    const result = findPanelByUid(panels, 'non-existent');

    expect(result).toBeUndefined();
  });

  it('should return undefined for empty array', () => {
    const result = findPanelByUid([], 'uid-1');
    expect(result).toBeUndefined();
  });
});

describe('removePanelsByUids', () => {
  const createMockPanel = (uid: string): DashboardPanel => ({
    type: 'lens',
    grid: { x: 0, y: 0, w: 12, h: 9 },
    config: {},
    uid,
  });

  it('should remove panels with specified UIDs', () => {
    const panels = [createMockPanel('uid-1'), createMockPanel('uid-2'), createMockPanel('uid-3')];
    const result = removePanelsByUids(panels, ['uid-1', 'uid-3']);

    expect(result).toHaveLength(1);
    expect(result[0].uid).toEqual('uid-2');
  });

  it('should return all panels when no UIDs match', () => {
    const panels = [createMockPanel('uid-1'), createMockPanel('uid-2')];
    const result = removePanelsByUids(panels, ['non-existent']);

    expect(result).toHaveLength(2);
  });

  it('should return empty array when all panels are removed', () => {
    const panels = [createMockPanel('uid-1'), createMockPanel('uid-2')];
    const result = removePanelsByUids(panels, ['uid-1', 'uid-2']);

    expect(result).toHaveLength(0);
  });

  it('should return original array when removal list is empty', () => {
    const panels = [createMockPanel('uid-1'), createMockPanel('uid-2')];
    const result = removePanelsByUids(panels, []);

    expect(result).toHaveLength(2);
  });

  it('should handle panels without UIDs (they should not be removed)', () => {
    const panelWithoutUid: DashboardPanel = {
      type: 'lens',
      grid: { x: 0, y: 0, w: 12, h: 9 },
      config: {},
    };
    const panels = [createMockPanel('uid-1'), panelWithoutUid];
    const result = removePanelsByUids(panels, ['uid-1']);

    expect(result).toHaveLength(1);
    expect(result[0].uid).toBeUndefined();
  });
});

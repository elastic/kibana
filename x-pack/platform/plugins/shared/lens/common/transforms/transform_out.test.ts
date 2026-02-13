/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import type { LensSerializedState, LensByValueSerializedState } from '@kbn/lens-common';
import type { Reference } from '@kbn/content-management-utils';
import { LENS_ITEM_VERSION_V2 } from '@kbn/lens-common/content_management/constants';
import { getTransformOut } from './transform_out';

describe('getTransformOut', () => {
  const mockBuilder = {
    getType: jest.fn(() => 'lnsXY'),
    isSupported: jest.fn(() => true),
    toAPIFormat: jest.fn((attrs) => attrs),
  } as unknown as LensConfigBuilder;

  const mockTransformDrilldownsOut = jest.fn((state) => state);

  const baseAttributes: LensAttributes = {
    title: 'Test Lens Chart',
    visualizationType: 'lnsXY',
    version: LENS_ITEM_VERSION_V2,
    state: {
      datasourceStates: {},
      visualization: {},
      query: { language: 'kuery', query: '' },
      filters: [],
      adHocDataViews: {},
    },
    references: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (mockBuilder.isSupported as jest.Mock).mockReturnValue(true);
    (mockBuilder.getType as jest.Mock).mockReturnValue('lnsXY');
    (mockBuilder.toAPIFormat as jest.Mock).mockImplementation((attrs) => attrs);
    mockTransformDrilldownsOut.mockImplementation((state) => state);
  });

  describe('excludes unified search context and panel props', () => {
    const unifiedSearchAndPanelProps = {
      syncColors: true,
      syncCursor: false,
      syncTooltips: true,
      query: { language: 'kuery', query: 'test' },
      filters: [{ meta: {}, query: {} }],
    };

    it('should exclude dashboard attributes from supported chart type result', () => {
      const storedState: LensByValueSerializedState = {
        ...unifiedSearchAndPanelProps,
        attributes: baseAttributes,
      };

      const transformOut = getTransformOut(mockBuilder, mockTransformDrilldownsOut);
      const result = transformOut(storedState, []);

      expect(result).toHaveProperty('attributes');
      expect(result).not.toHaveProperty('syncColors');
      expect(result).not.toHaveProperty('syncCursor');
      expect(result).not.toHaveProperty('syncTooltips');
      expect(result).not.toHaveProperty('query');
      expect(result).not.toHaveProperty('filters');
    });

    it('should preserve other properties while excluding unified search and panel props in by-ref', () => {
      const storedState: LensSerializedState = {
        ...unifiedSearchAndPanelProps,
        // No attributes - makes this a by-ref state
        title: 'My Lens Chart',
        description: 'A test chart',
        timeRange: { from: 'now-15m', to: 'now' },
      };

      const references: Reference[] = [
        {
          type: 'lens',
          id: 'lens-saved-object-id',
          name: 'savedObjectRef',
        },
      ];

      const transformOut = getTransformOut(mockBuilder, mockTransformDrilldownsOut);
      const result = transformOut(storedState, references);

      expect(result).toEqual({
        savedObjectId: 'lens-saved-object-id',
        title: 'My Lens Chart',
        description: 'A test chart',
        timeRange: { from: 'now-15m', to: 'now' },
      });
    });

    it('should preserve other properties while excluding unified search and panel props in by-value', () => {
      const storedState: LensByValueSerializedState = {
        ...unifiedSearchAndPanelProps,
        attributes: baseAttributes,
        title: 'My Lens Chart',
        description: 'A test chart',
        timeRange: { from: 'now-15m', to: 'now' },
      };

      const transformOut = getTransformOut(mockBuilder, mockTransformDrilldownsOut);
      const result = transformOut(storedState, []);

      expect(result).toHaveProperty('attributes');
      expect(result).toHaveProperty('title', 'My Lens Chart');
      expect(result).toHaveProperty('description', 'A test chart');
      expect(result).toHaveProperty('timeRange');
      expect(result).not.toHaveProperty('syncColors');
      expect(result).not.toHaveProperty('syncCursor');
      expect(result).not.toHaveProperty('syncTooltips');
      expect(result).not.toHaveProperty('query');
      expect(result).not.toHaveProperty('filters');
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolSelection, ToolDescriptor } from '@kbn/onechat-common';
import { allToolsSelectionWildcard } from '@kbn/onechat-common';
import {
  toggleProviderSelection,
  toggleToolSelection,
  isToolSelected,
  isAllToolsSelectedForProvider,
} from './tool_selection_utils';

describe('tool_selection_utils', () => {
  const mockTools: ToolDescriptor[] = [
    {
      id: 'tool1',
      meta: { providerId: 'provider1' },
      description: 'Tool 1',
    } as ToolDescriptor,
    {
      id: 'tool2',
      meta: { providerId: 'provider1' },
      description: 'Tool 2',
    } as ToolDescriptor,
    {
      id: 'tool3',
      meta: { providerId: 'provider2' },
      description: 'Tool 3',
    } as ToolDescriptor,
  ];

  describe('isToolSelected', () => {
    it('should return true when tool is individually selected', () => {
      const selectedTools: ToolSelection[] = [{ tool_ids: ['tool1'] }];

      expect(isToolSelected(mockTools[0], selectedTools)).toBe(true);
      expect(isToolSelected(mockTools[1], selectedTools)).toBe(false);
    });

    it('should return true when tool is selected via wildcard', () => {
      const selectedTools: ToolSelection[] = [
        { type: 'provider1', tool_ids: [allToolsSelectionWildcard] },
      ];

      expect(isToolSelected(mockTools[0], selectedTools)).toBe(true);
      expect(isToolSelected(mockTools[1], selectedTools)).toBe(true);
      expect(isToolSelected(mockTools[2], selectedTools)).toBe(false);
    });
  });

  describe('isAllToolsSelectedForProvider', () => {
    it('should return true when all tools are individually selected', () => {
      const selectedTools: ToolSelection[] = [{ tool_ids: ['tool1', 'tool2'] }];
      const provider1Tools = mockTools.filter((t) => t.meta.providerId === 'provider1');

      expect(isAllToolsSelectedForProvider('provider1', provider1Tools, selectedTools)).toBe(true);
    });

    it('should return true when all tools are selected via wildcard', () => {
      const selectedTools: ToolSelection[] = [
        { type: 'provider1', tool_ids: [allToolsSelectionWildcard] },
      ];
      const provider1Tools = mockTools.filter((t) => t.meta.providerId === 'provider1');

      expect(isAllToolsSelectedForProvider('provider1', provider1Tools, selectedTools)).toBe(true);
    });

    it('should return false when only some tools are selected', () => {
      const selectedTools: ToolSelection[] = [{ tool_ids: ['tool1'] }];
      const provider1Tools = mockTools.filter((t) => t.meta.providerId === 'provider1');

      expect(isAllToolsSelectedForProvider('provider1', provider1Tools, selectedTools)).toBe(false);
    });
  });

  describe('toggleProviderSelection', () => {
    it('should select all tools when none are selected', () => {
      const selectedTools: ToolSelection[] = [];
      const provider1Tools = mockTools.filter((t) => t.meta.providerId === 'provider1');

      const result = toggleProviderSelection('provider1', provider1Tools, selectedTools);

      expect(result).toEqual([{ type: 'provider1', tool_ids: [allToolsSelectionWildcard] }]);
    });

    it('should deselect all tools when all are selected', () => {
      const selectedTools: ToolSelection[] = [
        { type: 'provider1', tool_ids: [allToolsSelectionWildcard] },
      ];
      const provider1Tools = mockTools.filter((t) => t.meta.providerId === 'provider1');

      const result = toggleProviderSelection('provider1', provider1Tools, selectedTools);

      expect(result).toEqual([]);
    });
  });

  describe('toggleToolSelection', () => {
    it('should select tool when not selected', () => {
      const selectedTools: ToolSelection[] = [];
      const provider1Tools = mockTools.filter((t) => t.meta.providerId === 'provider1');

      const result = toggleToolSelection('tool1', 'provider1', provider1Tools, selectedTools);

      expect(result).toEqual([{ tool_ids: ['tool1'] }]);
    });

    it('should deselect tool when selected', () => {
      const selectedTools: ToolSelection[] = [{ tool_ids: ['tool1', 'tool2'] }];
      const provider1Tools = mockTools.filter((t) => t.meta.providerId === 'provider1');

      const result = toggleToolSelection('tool1', 'provider1', provider1Tools, selectedTools);

      expect(result).toEqual([{ tool_ids: ['tool2'] }]);
    });

    it('should handle wildcard to individual selection correctly', () => {
      const selectedTools: ToolSelection[] = [
        { type: 'provider1', tool_ids: [allToolsSelectionWildcard] },
      ];
      const provider1Tools = mockTools.filter((t) => t.meta.providerId === 'provider1');

      const result = toggleToolSelection('tool1', 'provider1', provider1Tools, selectedTools);

      expect(result).toEqual([{ type: 'provider1', tool_ids: ['tool2'] }]);
    });
  });
});

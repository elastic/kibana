/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolSelection, ToolSelectionRelevantFields, ToolType } from '@kbn/onechat-common';
import { allToolsSelectionWildcard } from '@kbn/onechat-common';
import {
  toggleTypeSelection,
  toggleToolSelection,
  isToolSelected,
  isAllToolsSelectedForType,
} from './tool_selection_utils';

describe('tool_selection_utils', () => {
  const mockTools: ToolSelectionRelevantFields[] = [
    {
      id: 'tool1',
      type: 'provider1' as ToolType,
      tags: [],
    },
    {
      id: 'tool2',
      type: 'provider1' as ToolType,
      tags: [],
    },
    {
      id: 'tool3',
      type: 'provider2' as ToolType,
      tags: [],
    },
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
      const provider1Tools = mockTools.filter((t) => t.type === ('provider1' as ToolType));

      expect(isAllToolsSelectedForType('provider1', provider1Tools, selectedTools)).toBe(true);
    });

    it('should return true when all tools are selected via wildcard', () => {
      const selectedTools: ToolSelection[] = [
        { type: 'provider1', tool_ids: [allToolsSelectionWildcard] },
      ];
      const provider1Tools = mockTools.filter((t) => t.type === ('provider1' as ToolType));

      expect(isAllToolsSelectedForType('provider1', provider1Tools, selectedTools)).toBe(true);
    });

    it('should return false when only some tools are selected', () => {
      const selectedTools: ToolSelection[] = [{ tool_ids: ['tool1'] }];
      const provider1Tools = mockTools.filter((t) => t.type === ('provider1' as ToolType));

      expect(isAllToolsSelectedForType('provider1', provider1Tools, selectedTools)).toBe(false);
    });
  });

  describe('toggleProviderSelection', () => {
    it('should select all tools when none are selected', () => {
      const selectedTools: ToolSelection[] = [];
      const provider1Tools = mockTools.filter((t) => t.type === ('provider1' as ToolType));

      const result = toggleTypeSelection('provider1', provider1Tools, selectedTools);

      expect(result).toEqual([{ type: 'provider1', tool_ids: [allToolsSelectionWildcard] }]);
    });

    it('should deselect all tools when all are selected', () => {
      const selectedTools: ToolSelection[] = [
        { type: 'provider1', tool_ids: [allToolsSelectionWildcard] },
      ];
      const provider1Tools = mockTools.filter((t) => t.type === ('provider1' as ToolType));

      const result = toggleTypeSelection('provider1', provider1Tools, selectedTools);

      expect(result).toEqual([]);
    });
  });

  describe('toggleToolSelection', () => {
    it('should select tool when not selected', () => {
      const selectedTools: ToolSelection[] = [];
      const provider1Tools = mockTools.filter((t) => t.type === ('provider1' as ToolType));

      const result = toggleToolSelection('tool1', 'provider1', provider1Tools, selectedTools);

      expect(result).toEqual([{ tool_ids: ['tool1'] }]);
    });

    it('should deselect tool when selected', () => {
      const selectedTools: ToolSelection[] = [{ tool_ids: ['tool1', 'tool2'] }];
      const provider1Tools = mockTools.filter((t) => t.type === ('provider1' as ToolType));

      const result = toggleToolSelection('tool1', 'provider1', provider1Tools, selectedTools);

      expect(result).toEqual([{ tool_ids: ['tool2'] }]);
    });

    it('should handle wildcard to individual selection correctly', () => {
      const selectedTools: ToolSelection[] = [
        { type: 'provider1', tool_ids: [allToolsSelectionWildcard] },
      ];
      const provider1Tools = mockTools.filter((t) => t.type === ('provider1' as ToolType));

      const result = toggleToolSelection('tool1', 'provider1', provider1Tools, selectedTools);

      expect(result).toEqual([{ type: 'provider1', tool_ids: ['tool2'] }]);
    });
  });
});

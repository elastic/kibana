/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolSelection, ToolSelectionRelevantFields } from '@kbn/onechat-common';
import { allToolsSelectionWildcard } from '@kbn/onechat-common';
import { toggleToolSelection, isToolSelected } from './tool_selection_utils';

describe('tool_selection_utils', () => {
  const mockTools: ToolSelectionRelevantFields[] = [
    {
      id: 'tool1',
    },
    {
      id: 'tool2',
    },
    {
      id: 'tool3',
    },
  ];

  describe('isToolSelected', () => {
    it('should return true when tool is individually selected', () => {
      const selectedTools: ToolSelection[] = [{ tool_ids: ['tool1'] }];

      expect(isToolSelected(mockTools[0], selectedTools)).toBe(true);
      expect(isToolSelected(mockTools[1], selectedTools)).toBe(false);
    });

    it('should return true when tool is selected via wildcard', () => {
      const selectedTools: ToolSelection[] = [{ tool_ids: [allToolsSelectionWildcard] }];

      expect(isToolSelected(mockTools[0], selectedTools)).toBe(true);
      expect(isToolSelected(mockTools[1], selectedTools)).toBe(true);
      expect(isToolSelected(mockTools[2], selectedTools)).toBe(true);
    });
  });

  describe('toggleToolSelection', () => {
    it('should add tool to empty selection', () => {
      const selectedTools: ToolSelection[] = [{ tool_ids: [] }];
      const result = toggleToolSelection('tool1', mockTools, selectedTools);

      expect(result).toHaveLength(1);
      expect(result[0].tool_ids).toContain('tool1');
    });

    it('should remove tool from selection', () => {
      const selectedTools: ToolSelection[] = [{ tool_ids: ['tool1', 'tool2'] }];
      const result = toggleToolSelection('tool1', mockTools, selectedTools);

      expect(result).toHaveLength(1);
      expect(result[0].tool_ids).not.toContain('tool1');
      expect(result[0].tool_ids).toContain('tool2');
    });

    it('should handle wildcard selection correctly', () => {
      const selectedTools: ToolSelection[] = [{ tool_ids: [allToolsSelectionWildcard] }];
      const result = toggleToolSelection('tool1', mockTools, selectedTools);

      // Should remove tool1 and include other available tools
      expect(result).toHaveLength(1);
      expect(result[0].tool_ids).not.toContain('tool1');
      expect(result[0].tool_ids).toContain('tool2');
      expect(result[0].tool_ids).toContain('tool3');
      expect(result[0].tool_ids).not.toContain(allToolsSelectionWildcard);
    });
  });
});

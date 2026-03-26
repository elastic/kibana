/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ToolSelection,
  ToolSelectionRelevantFields,
  ToolDefinition,
} from '@kbn/agent-builder-common';
import { ToolType, allToolsSelectionWildcard } from '@kbn/agent-builder-common';
import {
  toggleToolSelection,
  isToolSelected,
  cleanInvalidToolReferences,
} from './tool_selection_utils';
import type { AgentEditState } from '../hooks/agents/use_agent_edit';

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

  describe('cleanInvalidToolReferences', () => {
    const mockToolDefinitions: ToolDefinition[] = [
      {
        id: 'tool1',
        type: ToolType.esql,
        description: 'Tool 1',
        readonly: false,
        tags: [],
        configuration: {},
      },
      {
        id: 'tool2',
        type: ToolType.esql,
        description: 'Tool 2',
        readonly: false,
        tags: [],
        configuration: {},
      },
      {
        id: 'tool3',
        type: ToolType.esql,
        description: 'Tool 3',
        readonly: false,
        tags: [],
        configuration: {},
      },
    ];

    const createAgentData = (toolIds: string[][]): AgentEditState => ({
      id: 'test-agent',
      name: 'Test Agent',
      description: 'Test',
      labels: [],
      avatar_color: '',
      avatar_symbol: '',
      configuration: {
        instructions: '',
        tools: toolIds.map((ids) => ({ tool_ids: ids })),
      },
    });

    it('should remove non-existent tool IDs and preserve valid ones', () => {
      const data = createAgentData([['tool1', 'invalid_tool', 'tool2']]);
      const result = cleanInvalidToolReferences(data, mockToolDefinitions);

      expect(result.configuration.tools).toEqual([{ tool_ids: ['tool1', 'tool2'] }]);
    });

    it('should preserve wildcard selection while removing invalid tools', () => {
      const data = createAgentData([['*', 'invalid_tool']]);
      const result = cleanInvalidToolReferences(data, mockToolDefinitions);

      expect(result.configuration.tools).toEqual([{ tool_ids: ['*'] }]);
    });

    it('should remove empty selections after filtering out invalid tools', () => {
      const data = createAgentData([['tool1'], ['invalid_tool'], ['tool2']]);
      const result = cleanInvalidToolReferences(data, mockToolDefinitions);

      expect(result.configuration.tools).toEqual([
        { tool_ids: ['tool1'] },
        { tool_ids: ['tool2'] },
      ]);
    });

    it('should return empty array when all tool references are invalid', () => {
      const data = createAgentData([['invalid1', 'invalid2']]);
      const result = cleanInvalidToolReferences(data, mockToolDefinitions);

      expect(result.configuration.tools).toEqual([]);
    });
  });
});

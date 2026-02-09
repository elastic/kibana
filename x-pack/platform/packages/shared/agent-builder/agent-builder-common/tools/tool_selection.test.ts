/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ByIdsToolSelection, ToolSelectionRelevantFields } from './tool_selection';
import {
  allToolsSelectionWildcard,
  filterToolsBySelection,
  toolMatchSelection,
} from './tool_selection';

describe('toolMatchSelection', () => {
  const tool: ToolSelectionRelevantFields = {
    id: 'toolA',
  };

  it('should return true if tool_ids includes the tool id', () => {
    const toolSelection: ByIdsToolSelection = { tool_ids: ['toolA'] };
    expect(toolMatchSelection(tool, toolSelection)).toBe(true);
  });

  it('should return true if tool_ids includes allToolsSelectionWildcard', () => {
    const toolSelection: ByIdsToolSelection = { tool_ids: [allToolsSelectionWildcard] };
    expect(toolMatchSelection(tool, toolSelection)).toBe(true);
  });

  it('should return false if tool_ids does not include the tool id', () => {
    const toolSelection: ByIdsToolSelection = { tool_ids: ['toolB'] };
    expect(toolMatchSelection(tool, toolSelection)).toBe(false);
  });
});

describe('filterToolsBySelection', () => {
  const tools: ToolSelectionRelevantFields[] = [
    {
      id: 'toolA',
    },
    {
      id: 'toolB',
    },
    {
      id: 'toolC',
    },
  ];

  it('should filter tools by specific tool_ids', () => {
    const toolSelection: ByIdsToolSelection[] = [{ tool_ids: ['toolA', 'toolC'] }];
    const result = filterToolsBySelection(tools, toolSelection);
    expect(result).toEqual([
      {
        id: 'toolA',
      },
      {
        id: 'toolC',
      },
    ]);
  });

  it('should filter tools by allToolsSelectionWildcard', () => {
    const toolSelection: ByIdsToolSelection[] = [{ tool_ids: [allToolsSelectionWildcard] }];
    const result = filterToolsBySelection(tools, toolSelection);
    expect(result).toEqual(tools);
  });

  it('should return an empty array if no tools match the selection', () => {
    const toolSelection: ByIdsToolSelection[] = [{ tool_ids: ['nonExistentTool'] }];
    const result = filterToolsBySelection(tools, toolSelection);
    expect(result).toEqual([]);
  });

  it('should handle multiple tool ids in selection', () => {
    const toolSelection: ByIdsToolSelection[] = [{ tool_ids: ['toolA', 'toolB'] }];
    const result = filterToolsBySelection(tools, toolSelection);
    expect(result).toEqual([
      {
        id: 'toolA',
      },
      {
        id: 'toolB',
      },
    ]);
  });

  it('should handle multiple selections', () => {
    const toolSelection: ByIdsToolSelection[] = [{ tool_ids: ['toolA'] }, { tool_ids: ['toolC'] }];
    const result = filterToolsBySelection(tools, toolSelection);
    expect(result).toEqual([
      {
        id: 'toolA',
      },
      {
        id: 'toolC',
      },
    ]);
  });
});

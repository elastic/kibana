/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ByIdsToolSelection,
  ResolvableToolSelection,
  ToolSelectionRelevantFields,
} from './tool_selection';
import {
  allToolsSelectionWildcard,
  filterToolsBySelection,
  isByIdsToolSelection,
  isExcludeToolSelection,
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

  it('should subtract tools listed in an exclude selection', () => {
    const toolSelection: ResolvableToolSelection[] = [
      { tool_ids: [allToolsSelectionWildcard] },
      { exclude_tool_ids: ['toolB'] },
    ];
    const result = filterToolsBySelection(tools, toolSelection);
    expect(result).toEqual([{ id: 'toolA' }, { id: 'toolC' }]);
  });

  it('should let exclusion win over an explicit include of the same id', () => {
    const toolSelection: ResolvableToolSelection[] = [
      { tool_ids: ['toolA', 'toolB', 'toolC'] },
      { exclude_tool_ids: ['toolA', 'toolC'] },
    ];
    const result = filterToolsBySelection(tools, toolSelection);
    expect(result).toEqual([{ id: 'toolB' }]);
  });

  it('should union exclude ids across multiple exclude selections', () => {
    const toolSelection: ResolvableToolSelection[] = [
      { tool_ids: [allToolsSelectionWildcard] },
      { exclude_tool_ids: ['toolA'] },
      { exclude_tool_ids: ['toolC'] },
    ];
    const result = filterToolsBySelection(tools, toolSelection);
    expect(result).toEqual([{ id: 'toolB' }]);
  });

  it('should be a no-op when exclude_tool_ids is empty', () => {
    const toolSelection: ResolvableToolSelection[] = [
      { tool_ids: [allToolsSelectionWildcard] },
      { exclude_tool_ids: [] },
    ];
    const result = filterToolsBySelection(tools, toolSelection);
    expect(result).toEqual(tools);
  });

  it('should ignore exclude ids that are not present in the tool set', () => {
    const toolSelection: ResolvableToolSelection[] = [
      { tool_ids: [allToolsSelectionWildcard] },
      { exclude_tool_ids: ['nonExistentTool'] },
    ];
    const result = filterToolsBySelection(tools, toolSelection);
    expect(result).toEqual(tools);
  });

  it('should return an empty array when an exclude selection is present but no include selection matches', () => {
    const toolSelection: ResolvableToolSelection[] = [{ exclude_tool_ids: ['toolA'] }];
    const result = filterToolsBySelection(tools, toolSelection);
    expect(result).toEqual([]);
  });
});

describe('isByIdsToolSelection / isExcludeToolSelection', () => {
  it('identifies an include selection', () => {
    expect(isByIdsToolSelection({ tool_ids: ['toolA'] })).toBe(true);
    expect(isExcludeToolSelection({ tool_ids: ['toolA'] })).toBe(false);
  });

  it('identifies an exclude selection', () => {
    expect(isExcludeToolSelection({ exclude_tool_ids: ['toolA'] })).toBe(true);
    expect(isByIdsToolSelection({ exclude_tool_ids: ['toolA'] })).toBe(false);
  });
});

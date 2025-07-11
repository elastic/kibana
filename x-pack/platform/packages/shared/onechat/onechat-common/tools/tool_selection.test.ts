/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolDescriptor } from './tools';
import {
  allToolsSelectionWildcard,
  ByIdsToolSelection,
  filterToolsBySelection,
  toolMatchSelection,
} from './tool_selection';

describe('toolMatchSelection', () => {
  const tool: ToolDescriptor = {
    id: 'toolA',
    description: 'Tool A description',
    meta: {
      providerId: 'type1',
      tags: [],
    },
  };

  it('should return true if provider matches and toolId is included', () => {
    const toolSelection: ByIdsToolSelection = { type: 'type1', tool_ids: ['toolA'] };
    expect(toolMatchSelection(tool, toolSelection)).toBe(true);
  });

  it('should return false if type does not match', () => {
    const toolSelection: ByIdsToolSelection = { type: 'type2', tool_ids: ['toolA'] };
    expect(toolMatchSelection(tool, toolSelection)).toBe(false);
  });

  it('should return true if tool_ids includes allToolsSelectionWildcard', () => {
    const toolSelection: ByIdsToolSelection = { tool_ids: [allToolsSelectionWildcard] };
    expect(toolMatchSelection(tool, toolSelection)).toBe(true);
  });

  it('should return true if tool_ids includes the tool id and no type is specified', () => {
    const toolSelection: ByIdsToolSelection = { tool_ids: ['toolA'] };
    expect(toolMatchSelection(tool, toolSelection)).toBe(true);
  });

  it('should return false if tool_ids does not include the tool id', () => {
    const toolSelection: ByIdsToolSelection = { tool_ids: ['toolB'] };
    expect(toolMatchSelection(tool, toolSelection)).toBe(false);
  });

  it('should throw an error for invalid tool selection type', () => {
    const toolSelection: any = { invalid: true };
    expect(() => toolMatchSelection(tool, toolSelection)).toThrowError(/Invalid tool selection/);
  });
});

describe('filterToolsBySelection', () => {
  const tools: ToolDescriptor[] = [
    {
      id: 'toolA',
      description: 'Tool A description',
      meta: {
        providerId: 'type1',
        tags: [],
      },
    },
    {
      id: 'toolB',
      description: 'Tool B description',
      meta: {
        providerId: 'type1',
        tags: [],
      },
    },
    {
      id: 'toolC',
      description: 'Tool C description',
      meta: {
        providerId: 'type2',
        tags: [],
      },
    },
  ];

  it('should filter tools by specific tool_ids', () => {
    const toolSelection: ByIdsToolSelection[] = [{ tool_ids: ['toolA', 'toolC'] }];
    const result = filterToolsBySelection(tools, toolSelection);
    expect(result).toEqual([
      {
        id: 'toolA',
        description: 'Tool A description',
        meta: {
          providerId: 'type1',
          tags: [],
        },
      },
      {
        id: 'toolC',
        description: 'Tool C description',
        meta: {
          providerId: 'type2',
          tags: [],
        },
      },
    ]);
  });

  it('should filter tools by allToolsSelectionWildcard', () => {
    const toolSelection: ByIdsToolSelection[] = [{ tool_ids: [allToolsSelectionWildcard] }];
    const result = filterToolsBySelection(tools, toolSelection);
    expect(result).toEqual(tools);
  });

  it('should filter tools by provider', () => {
    const toolSelection: ByIdsToolSelection[] = [
      { type: 'type1', tool_ids: [allToolsSelectionWildcard] },
    ];
    const result = filterToolsBySelection(tools, toolSelection);
    expect(result).toEqual([
      {
        id: 'toolA',
        description: 'Tool A description',
        meta: {
          providerId: 'type1',
          tags: [],
        },
      },
      {
        id: 'toolB',
        description: 'Tool B description',
        meta: {
          providerId: 'type1',
          tags: [],
        },
      },
    ]);
  });

  it('should filter tools by provider and specific tool_ids', () => {
    const toolSelection: ByIdsToolSelection[] = [{ type: 'type1', tool_ids: ['toolA'] }];
    const result = filterToolsBySelection(tools, toolSelection);
    expect(result).toEqual([
      {
        id: 'toolA',
        description: 'Tool A description',
        meta: {
          providerId: 'type1',
          tags: [],
        },
      },
    ]);
  });

  it('should return an empty array if no tools match the selection', () => {
    const toolSelection: ByIdsToolSelection[] = [{ tool_ids: ['nonExistentTool'] }];
    const result = filterToolsBySelection(tools, toolSelection);
    expect(result).toEqual([]);
  });

  it('should handle multiple selections', () => {
    const toolSelection: ByIdsToolSelection[] = [
      { type: 'type1', tool_ids: ['toolA'] },
      { type: 'type2', tool_ids: [allToolsSelectionWildcard] },
    ];
    const result = filterToolsBySelection(tools, toolSelection);
    expect(result).toEqual([
      {
        id: 'toolA',
        description: 'Tool A description',
        meta: {
          providerId: 'type1',
          tags: [],
        },
      },
      {
        id: 'toolC',
        description: 'Tool C description',
        meta: {
          providerId: 'type2',
          tags: [],
        },
      },
    ]);
  });
});

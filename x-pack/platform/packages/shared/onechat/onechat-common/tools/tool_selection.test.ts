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
      providerId: 'provider1',
      tags: [],
    },
  };

  it('should return true if provider matches and toolId is included', () => {
    const toolSelection: ByIdsToolSelection = { provider: 'provider1', toolIds: ['toolA'] };
    expect(toolMatchSelection(tool, toolSelection)).toBe(true);
  });

  it('should return false if provider does not match', () => {
    const toolSelection: ByIdsToolSelection = { provider: 'provider2', toolIds: ['toolA'] };
    expect(toolMatchSelection(tool, toolSelection)).toBe(false);
  });

  it('should return true if toolIds includes allToolsSelectionWildcard', () => {
    const toolSelection: ByIdsToolSelection = { toolIds: [allToolsSelectionWildcard] };
    expect(toolMatchSelection(tool, toolSelection)).toBe(true);
  });

  it('should return true if toolIds includes the tool id and no provider is specified', () => {
    const toolSelection: ByIdsToolSelection = { toolIds: ['toolA'] };
    expect(toolMatchSelection(tool, toolSelection)).toBe(true);
  });

  it('should return false if toolIds does not include the tool id', () => {
    const toolSelection: ByIdsToolSelection = { toolIds: ['toolB'] };
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
        providerId: 'provider1',
        tags: [],
      },
    },
    {
      id: 'toolB',
      description: 'Tool B description',
      meta: {
        providerId: 'provider1',
        tags: [],
      },
    },
    {
      id: 'toolC',
      description: 'Tool C description',
      meta: {
        providerId: 'provider2',
        tags: [],
      },
    },
  ];

  it('should filter tools by specific toolIds', () => {
    const toolSelection: ByIdsToolSelection[] = [{ toolIds: ['toolA', 'toolC'] }];
    const result = filterToolsBySelection(tools, toolSelection);
    expect(result).toEqual([
      {
        id: 'toolA',
        description: 'Tool A description',
        meta: {
          providerId: 'provider1',
          tags: [],
        },
      },
      {
        id: 'toolC',
        description: 'Tool C description',
        meta: {
          providerId: 'provider2',
          tags: [],
        },
      },
    ]);
  });

  it('should filter tools by allToolsSelectionWildcard', () => {
    const toolSelection: ByIdsToolSelection[] = [{ toolIds: [allToolsSelectionWildcard] }];
    const result = filterToolsBySelection(tools, toolSelection);
    expect(result).toEqual(tools);
  });

  it('should filter tools by provider', () => {
    const toolSelection: ByIdsToolSelection[] = [
      { provider: 'provider1', toolIds: [allToolsSelectionWildcard] },
    ];
    const result = filterToolsBySelection(tools, toolSelection);
    expect(result).toEqual([
      {
        id: 'toolA',
        description: 'Tool A description',
        meta: {
          providerId: 'provider1',
          tags: [],
        },
      },
      {
        id: 'toolB',
        description: 'Tool B description',
        meta: {
          providerId: 'provider1',
          tags: [],
        },
      },
    ]);
  });

  it('should filter tools by provider and specific toolIds', () => {
    const toolSelection: ByIdsToolSelection[] = [{ provider: 'provider1', toolIds: ['toolA'] }];
    const result = filterToolsBySelection(tools, toolSelection);
    expect(result).toEqual([
      {
        id: 'toolA',
        description: 'Tool A description',
        meta: {
          providerId: 'provider1',
          tags: [],
        },
      },
    ]);
  });

  it('should return an empty array if no tools match the selection', () => {
    const toolSelection: ByIdsToolSelection[] = [{ toolIds: ['nonExistentTool'] }];
    const result = filterToolsBySelection(tools, toolSelection);
    expect(result).toEqual([]);
  });

  it('should handle multiple selections', () => {
    const toolSelection: ByIdsToolSelection[] = [
      { provider: 'provider1', toolIds: ['toolA'] },
      { provider: 'provider2', toolIds: [allToolsSelectionWildcard] },
    ];
    const result = filterToolsBySelection(tools, toolSelection);
    expect(result).toEqual([
      {
        id: 'toolA',
        description: 'Tool A description',
        meta: {
          providerId: 'provider1',
          tags: [],
        },
      },
      {
        id: 'toolC',
        description: 'Tool C description',
        meta: {
          providerId: 'provider2',
          tags: [],
        },
      },
    ]);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateToolSelection } from './utils';
import type { KibanaRequest } from '@kbn/core/server';
import { ToolType } from '@kbn/agent-builder-common';
import { z } from '@kbn/zod';

const mockRequest = {} as KibanaRequest;
const generateMockTool = (id: string, type: ToolType) => ({
  id,
  type,
  description: '',
  tags: [],
  configuration: {},
  schema: z.object({}),
  handler: () => undefined,
});

describe('validateToolSelection (unit)', () => {
  const toolA = generateMockTool('toolA', ToolType.builtin);
  const toolB = generateMockTool('toolB', ToolType.esql);

  const makeRegistry = (tools: any[]) => ({
    list: jest.fn().mockResolvedValue(tools),
    has: jest.fn().mockImplementation((toolId: string) => {
      return Promise.resolve(tools.some((tool) => tool.id === toolId));
    }),
  });

  it('returns error if tool id does not exist globally', async () => {
    const registry = makeRegistry([toolA, toolB]);
    const errors = await validateToolSelection({
      toolRegistry: registry as any,
      request: mockRequest,
      toolSelection: [{ tool_ids: ['nonexistent'] }],
    });
    expect(errors.join(' ')).toMatch(/Tool id 'nonexistent' does not exist/);
  });

  it('passes for wildcard tool selection', async () => {
    const registry = makeRegistry([toolA, toolB]);
    const errors = await validateToolSelection({
      toolRegistry: registry as any,
      request: mockRequest,
      toolSelection: [{ tool_ids: ['*'] }],
    });
    expect(errors).toHaveLength(0);
  });

  it('passes for valid tool id', async () => {
    const registry = makeRegistry([toolA, toolB]);
    const errors = await validateToolSelection({
      toolRegistry: registry as any,
      request: mockRequest,
      toolSelection: [{ tool_ids: ['toolA'] }],
    });
    expect(errors).toHaveLength(0);
  });

  it('passes for multiple valid tool ids', async () => {
    const registry = makeRegistry([toolA, toolB]);
    const errors = await validateToolSelection({
      toolRegistry: registry as any,
      request: mockRequest,
      toolSelection: [{ tool_ids: ['toolA', 'toolB'] }],
    });
    expect(errors).toHaveLength(0);
  });

  it('returns error for mix of valid and invalid tool ids', async () => {
    const registry = makeRegistry([toolA, toolB]);
    const errors = await validateToolSelection({
      toolRegistry: registry as any,
      request: mockRequest,
      toolSelection: [{ tool_ids: ['toolA', 'nonexistent'] }],
    });
    expect(errors.join(' ')).toMatch(/Tool id 'nonexistent' does not exist/);
    expect(errors).toHaveLength(1);
  });

  it('handles empty tool_ids array', async () => {
    const registry = makeRegistry([toolA, toolB]);
    const errors = await validateToolSelection({
      toolRegistry: registry as any,
      request: mockRequest,
      toolSelection: [{ tool_ids: [] }],
    });
    expect(errors).toHaveLength(0);
  });
});

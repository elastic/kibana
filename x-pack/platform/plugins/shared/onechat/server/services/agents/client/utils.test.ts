/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateToolSelection } from './utils';
import type { KibanaRequest } from '@kbn/core/server';
import { ToolType } from '@kbn/onechat-common';
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
  const toolC = generateMockTool('toolC', ToolType.builtin);

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

  it('returns error if tool type does not exist for wildcard selection', async () => {
    const registry = makeRegistry([toolA, toolB]);
    const errors = await validateToolSelection({
      toolRegistry: registry as any,
      request: mockRequest,
      toolSelection: [{ type: 'nonexistent' as ToolType, tool_ids: ['*'] }],
    });
    expect(errors.join(' ')).toMatch(/Tool type 'nonexistent' does not exist/);
  });

  it('returns error if tool exists but belongs to different type', async () => {
    const registry = makeRegistry([toolA, toolB]);
    const errors = await validateToolSelection({
      toolRegistry: registry as any,
      request: mockRequest,
      toolSelection: [{ type: ToolType.esql, tool_ids: ['toolA'] }],
    });
    expect(errors.join(' ')).toMatch(/Tool id 'toolA' belongs to type 'builtin', not 'esql'/);
  });

  it('returns error if tool does not exist for specified type', async () => {
    const registry = makeRegistry([toolA, toolB]);
    const errors = await validateToolSelection({
      toolRegistry: registry as any,
      request: mockRequest,
      toolSelection: [{ type: ToolType.builtin, tool_ids: ['nonexistent'] }],
    });
    expect(errors.join(' ')).toMatch(/Tool id 'nonexistent' does not exist/);
  });

  it('passes for valid tool id with correct type', async () => {
    const registry = makeRegistry([toolA, toolB]);
    const errors = await validateToolSelection({
      toolRegistry: registry as any,
      request: mockRequest,
      toolSelection: [{ type: ToolType.builtin, tool_ids: ['toolA'] }],
    });
    expect(errors).toHaveLength(0);
  });

  it('passes for valid tool id without type specification', async () => {
    const registry = makeRegistry([toolA, toolB]);
    const errors = await validateToolSelection({
      toolRegistry: registry as any,
      request: mockRequest,
      toolSelection: [{ tool_ids: ['toolA'] }],
    });
    expect(errors).toHaveLength(0);
  });

  it('passes for wildcard tool selection (all tools)', async () => {
    const registry = makeRegistry([toolA, toolB]);
    const errors = await validateToolSelection({
      toolRegistry: registry as any,
      request: mockRequest,
      toolSelection: [{ tool_ids: ['*'] }],
    });
    expect(errors).toHaveLength(0);
  });

  it('passes for wildcard tool selection for existing tool type', async () => {
    const registry = makeRegistry([toolA, toolB]);
    const errors = await validateToolSelection({
      toolRegistry: registry as any,
      request: mockRequest,
      toolSelection: [{ type: ToolType.builtin, tool_ids: ['*'] }],
    });
    expect(errors).toHaveLength(0);
  });

  it('passes for wildcard tool selection for builtin type', async () => {
    const builtInTool = generateMockTool('foo', ToolType.builtin);
    const registry = makeRegistry([builtInTool]);
    const errors = await validateToolSelection({
      toolRegistry: registry as any,
      request: mockRequest,
      toolSelection: [{ type: ToolType.builtin, tool_ids: ['*'] }],
    });
    expect(errors).toHaveLength(0);
  });

  it('accumulates multiple errors', async () => {
    const registry = makeRegistry([toolA, toolB]);
    const errors = await validateToolSelection({
      toolRegistry: registry as any,
      request: mockRequest,
      toolSelection: [
        { tool_ids: ['toolA', 'nonexistent'] },
        { type: 'nonexistent' as ToolType, tool_ids: ['toolA'] },
      ],
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Tool id 'nonexistent' does not exist/),
        expect.stringMatching(/Tool type 'nonexistent' does not exist/),
      ])
    );
  });

  it('handles mixed valid and invalid selections', async () => {
    const registry = makeRegistry([toolA, toolB, toolC]);
    const errors = await validateToolSelection({
      toolRegistry: registry as any,
      request: mockRequest,
      toolSelection: [
        { type: ToolType.builtin, tool_ids: ['toolA', 'nonexistent'] },
        { tool_ids: ['toolB'] },
        { type: ToolType.esql, tool_ids: ['toolA'] }, // toolA belongs to builtin, not esql
      ],
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Tool id 'nonexistent' does not exist/),
        expect.stringMatching(/Tool id 'toolA' belongs to type 'builtin', not 'esql'/),
      ])
    );
  });
});

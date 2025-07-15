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
const generateMockTool = (id: string, providerId: string) => ({
  id,
  description: '',
  meta: { providerId, tags: [] },
  schema: z.object({}),
  handler: () => undefined,
});

describe('validateToolSelection (unit)', () => {
  const toolA1 = generateMockTool('toolA', 'prov1');
  const toolA2 = generateMockTool('toolA', 'prov2');
  const toolB = generateMockTool('toolB', 'prov1');

  const makeRegistry = (tools: any[], hasImpl?: (args: any) => Promise<boolean>) => ({
    list: jest.fn().mockResolvedValue(tools),
    has: hasImpl || jest.fn().mockResolvedValue(true),
  });

  it('returns error if tool id is ambiguous (multiple providers, no provider specified)', async () => {
    const registry = makeRegistry([toolA1, toolA2]);
    const errors = await validateToolSelection({
      toolRegistry: registry as any,
      request: mockRequest,
      toolSelection: [{ tool_ids: ['toolA'] }],
    });
    expect(errors.join(' ')).toMatch(/ambiguous/);
  });

  it('returns error if tool id does not exist in any provider', async () => {
    const registry = makeRegistry([toolA1, toolB]);
    const errors = await validateToolSelection({
      toolRegistry: registry as any,
      request: mockRequest,
      toolSelection: [{ tool_ids: ['nonexistent'] }],
    });
    expect(errors.join(' ')).toMatch(/does not exist in any provider/);
  });

  it('returns error if provider does not exist', async () => {
    const registry = makeRegistry([toolA1, toolB]);
    const errors = await validateToolSelection({
      toolRegistry: registry as any,
      request: mockRequest,
      toolSelection: [{ type: ToolType.esql, tool_ids: ['toolA'] }],
    });
    expect(errors.join(' ')).toMatch(/Provider 'provX' does not exist/);
  });

  it('returns error if provider has no tools (wildcard)', async () => {
    const registry = makeRegistry([toolA1, toolB]);
    const errors = await validateToolSelection({
      toolRegistry: registry as any,
      request: mockRequest,
      toolSelection: [{ type: ToolType.esql, tool_ids: ['*'] }],
    });
    expect(errors.join(' ')).toMatch(/Provider 'prov2' does not exist/);
  });

  it('returns error if tool id does not exist for provider', async () => {
    const registry = makeRegistry([toolA1, toolB], async ({ toolId, providerId }) => false);
    const errors = await validateToolSelection({
      toolRegistry: registry as any,
      request: mockRequest,
      toolSelection: [{ type: ToolType.esql, tool_ids: ['toolC'] }],
    });
    expect(errors.join(' ')).toMatch(/does not exist for provider/);
  });

  it('passes for valid tool id with provider', async () => {
    const registry = makeRegistry([toolA1, toolB], async ({ toolId, providerId }) => true);
    const errors = await validateToolSelection({
      toolRegistry: registry as any,
      request: mockRequest,
      toolSelection: [{ type: ToolType.esql, tool_ids: ['toolA'] }],
    });
    expect(errors).toHaveLength(0);
  });

  it('passes for valid tool id without provider (unambiguous)', async () => {
    const registry = makeRegistry([toolB]);
    const errors = await validateToolSelection({
      toolRegistry: registry as any,
      request: mockRequest,
      toolSelection: [{ tool_ids: ['toolB'] }],
    });
    expect(errors).toHaveLength(0);
  });

  it('passes for wildcard tool selection (all tools)', async () => {
    const registry = makeRegistry([toolA1, toolB]);
    const errors = await validateToolSelection({
      toolRegistry: registry as any,
      request: mockRequest,
      toolSelection: [{ tool_ids: ['*'] }],
    });
    expect(errors).toHaveLength(0);
  });

  it('passes for wildcard tool selection for provider (all tools for provider)', async () => {
    const registry = makeRegistry([toolA1, toolB]);
    const errors = await validateToolSelection({
      toolRegistry: registry as any,
      request: mockRequest,
      toolSelection: [{ type: ToolType.esql, tool_ids: ['*'] }],
    });
    expect(errors).toHaveLength(0);
  });

  it('passes for wildcard tool selection for builtIn provider (regression test)', async () => {
    const builtInTool = generateMockTool('foo', 'builtIn');
    const registry = makeRegistry([builtInTool]);
    const errors = await validateToolSelection({
      toolRegistry: registry as any,
      request: mockRequest,
      toolSelection: [{ type: ToolType.builtin, tool_ids: ['*'] }],
    });
    expect(errors).toHaveLength(0);
  });

  it('accumulates multiple errors', async () => {
    const registry = makeRegistry([toolA1, toolA2]);
    const errors = await validateToolSelection({
      toolRegistry: registry as any,
      request: mockRequest,
      toolSelection: [
        { tool_ids: ['toolA', 'nonexistent'] },
        { type: 'provX' as ToolType, tool_ids: ['toolA'] },
      ],
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Tool id 'toolA' is ambiguous/),
        expect.stringMatching(/Tool id 'nonexistent' does not exist/),
        expect.stringMatching(/Provider 'provX' does not exist/),
      ])
    );
  });
});

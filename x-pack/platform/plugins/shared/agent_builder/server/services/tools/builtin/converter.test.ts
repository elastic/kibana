/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type {
  BuiltinToolDefinition,
  StaticEsqlTool,
  StaticIndexSearchTool,
  StaticWorkflowTool,
} from '@kbn/agent-builder-server/tools';
import { convertTool } from './converter';
import { ToolAvailabilityCache } from './availability_cache';
import type { BuiltinToolTypeDefinition, ToolTypeDefinition } from '../tool_types/definitions';

const makeBuiltinRegistration = (
  overrides: Partial<BuiltinToolDefinition> = {}
): BuiltinToolDefinition => ({
  id: 'platform.test.tool',
  type: ToolType.builtin,
  description: 'A test tool',
  tags: [],
  schema: z.object({}),
  handler: (async () => ({ results: [] })) as any,
  ...overrides,
});

const builtinDefinition: BuiltinToolTypeDefinition = {
  toolType: ToolType.builtin,
  builtin: true,
};

const baseContext = { spaceId: 'default', request: {} as any };

const makeStaticEsqlTool = (overrides: Partial<StaticEsqlTool> = {}): StaticEsqlTool => ({
  id: 'my_esql_tool',
  type: ToolType.esql,
  description: 'A custom ESQL tool',
  tags: [],
  configuration: { query: 'FROM logs | LIMIT 10', params: {} },
  ...overrides,
});

const makeStaticIndexSearchTool = (
  overrides: Partial<StaticIndexSearchTool> = {}
): StaticIndexSearchTool => ({
  id: 'my_index_search_tool',
  type: ToolType.index_search,
  description: 'A custom index search tool',
  tags: [],
  configuration: { pattern: 'logs-*' },
  ...overrides,
});

const makeStaticWorkflowTool = (
  overrides: Partial<StaticWorkflowTool> = {}
): StaticWorkflowTool => ({
  id: 'my_workflow_tool',
  type: ToolType.workflow,
  description: 'A custom workflow tool',
  tags: [],
  configuration: { workflow_id: 'wf-1' },
  ...overrides,
});

const nonBuiltinDefinition: ToolTypeDefinition = {
  toolType: ToolType.esql,
  getDynamicProps: jest.fn().mockResolvedValue({
    getSchema: () => z.object({}),
    getHandler: () => jest.fn(),
  }),
  createSchema: {} as any,
  updateSchema: {} as any,
  validateForCreate: jest.fn() as any,
  validateForUpdate: jest.fn() as any,
};

describe('convertTool (builtin)', () => {
  it('defaults experimental to false when not set', () => {
    const tool = makeBuiltinRegistration();
    const result = convertTool({
      tool,
      definition: builtinDefinition,
      context: baseContext,
      cache: new ToolAvailabilityCache(),
    });
    expect(result.experimental).toBe(false);
  });

  it('carries experimental: true through to internal definition', () => {
    const tool = makeBuiltinRegistration({ experimental: true });
    const result = convertTool({
      tool,
      definition: builtinDefinition,
      context: baseContext,
      cache: new ToolAvailabilityCache(),
    });
    expect(result.experimental).toBe(true);
  });

  it('carries experimental: false when explicitly set', () => {
    const tool = makeBuiltinRegistration({ experimental: false });
    const result = convertTool({
      tool,
      definition: builtinDefinition,
      context: baseContext,
      cache: new ToolAvailabilityCache(),
    });
    expect(result.experimental).toBe(false);
  });

  it('propagates annotations from the builtin tool definition', () => {
    const annotations = {
      title: 'Test Tool',
      readOnlyHint: true as const,
      destructiveHint: false as const,
      idempotentHint: true as const,
      openWorldHint: false as const,
    };
    const tool = makeBuiltinRegistration({ annotations });
    const result = convertTool({
      tool,
      definition: builtinDefinition,
      context: baseContext,
      cache: new ToolAvailabilityCache(),
    });
    expect(result.annotations).toEqual(annotations);
  });

  it('leaves annotations undefined when not set on builtin tool', () => {
    const tool = makeBuiltinRegistration();
    const result = convertTool({
      tool,
      definition: builtinDefinition,
      context: baseContext,
      cache: new ToolAvailabilityCache(),
    });
    expect(result.annotations).toBeUndefined();
  });
});

describe('convertTool (static/non-builtin) — default annotations', () => {
  it('assigns read-only annotations for ESQL tools', () => {
    const tool = makeStaticEsqlTool();
    const result = convertTool({
      tool,
      definition: nonBuiltinDefinition,
      context: baseContext,
      cache: new ToolAvailabilityCache(),
    });
    expect(result.annotations).toEqual({
      title: 'my_esql_tool',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    });
  });

  it('assigns read-only annotations for index search tools', () => {
    const tool = makeStaticIndexSearchTool();
    const result = convertTool({
      tool,
      definition: nonBuiltinDefinition,
      context: baseContext,
      cache: new ToolAvailabilityCache(),
    });
    expect(result.annotations).toEqual({
      title: 'my_index_search_tool',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    });
  });

  it('assigns destructive annotations for workflow tools', () => {
    const tool = makeStaticWorkflowTool();
    const result = convertTool({
      tool,
      definition: nonBuiltinDefinition,
      context: baseContext,
      cache: new ToolAvailabilityCache(),
    });
    expect(result.annotations).toEqual({
      title: 'my_workflow_tool',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: true,
    });
  });

  it('uses tool.id as the title', () => {
    const tool = makeStaticEsqlTool({ id: 'custom.query.v2' });
    const result = convertTool({
      tool,
      definition: nonBuiltinDefinition,
      context: baseContext,
      cache: new ToolAvailabilityCache(),
    });
    expect(result.annotations?.title).toBe('custom.query.v2');
  });
});

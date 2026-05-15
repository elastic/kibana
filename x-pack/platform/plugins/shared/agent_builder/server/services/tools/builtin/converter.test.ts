/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools';
import { convertTool } from './converter';
import { ToolAvailabilityCache } from './availability_cache';
import type { BuiltinToolTypeDefinition } from '../tool_types/definitions';

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
});

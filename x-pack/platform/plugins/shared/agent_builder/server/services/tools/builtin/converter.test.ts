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
  DynamicSchemaBuiltinToolDefinition,
} from '@kbn/agent-builder-server/tools';
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

const makeDynamicSchemaBuiltinRegistration = (
  getSchema: DynamicSchemaBuiltinToolDefinition['getSchema']
): DynamicSchemaBuiltinToolDefinition => ({
  id: 'platform.test.tool',
  type: ToolType.builtin,
  description: 'A test tool',
  tags: [],
  getSchema,
  handler: (async () => ({ results: [] })) as any,
});

const builtinDefinition: BuiltinToolTypeDefinition = {
  toolType: ToolType.builtin,
  builtin: true,
};

const baseContext = { spaceId: 'default', request: {} as any };

describe('convertTool (builtin)', () => {
  it('uses the static schema of the tool', async () => {
    const schema = z.object({ foo: z.string() });
    const tool = makeBuiltinRegistration({ schema });
    const result = convertTool({
      tool,
      definition: builtinDefinition,
      context: baseContext,
      cache: new ToolAvailabilityCache(),
    });
    expect(await result.getSchema()).toBe(schema);
  });

  it('resolves the dynamic schema with the schema context', async () => {
    const dynamicSchema = z.object({ bar: z.string() });
    const getSchema = jest.fn().mockResolvedValue(dynamicSchema);
    const schemaContext = { ...baseContext, uiSettings: {} as any };
    const tool = makeDynamicSchemaBuiltinRegistration(getSchema);
    const result = convertTool({
      tool,
      definition: builtinDefinition,
      context: baseContext,
      getSchemaContext: () => schemaContext,
      cache: new ToolAvailabilityCache(),
    });

    expect(await result.getSchema()).toBe(dynamicSchema);
    expect(getSchema).toHaveBeenCalledWith(schemaContext);
  });

  it('throws when converting a dynamic schema tool without a schema context', () => {
    const tool = makeDynamicSchemaBuiltinRegistration(jest.fn());
    expect(() =>
      convertTool({
        tool,
        definition: builtinDefinition,
        context: baseContext,
        cache: new ToolAvailabilityCache(),
      })
    ).toThrow(/has a dynamic schema but no schema context is set/);
  });
});

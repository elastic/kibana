/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z as z4 } from '@kbn/zod/v4';
import { z as z3 } from '@kbn/zod';
import type { ToolDefinition } from '@langchain/core/language_models/base';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { toolDefinitionToInference } from './tools';

const collectRefs = (node: unknown, refs: string[] = []): string[] => {
  if (Array.isArray(node)) {
    node.forEach((item) => collectRefs(item, refs));
  } else if (node && typeof node === 'object') {
    Object.entries(node).forEach(([key, value]) => {
      if (key === '$ref' && typeof value === 'string') {
        refs.push(value);
      } else {
        collectRefs(value, refs);
      }
    });
  }
  return refs;
};

const resolvePointer = (root: unknown, ref: string): unknown =>
  ref
    .replace(/^#\/?/, '')
    .split('/')
    .filter(Boolean)
    .reduce<any>((node, segment) => node?.[segment.replace(/~1/g, '/').replace(/~0/g, '~')], root);

const expectNoDanglingRefs = (schema: unknown) => {
  const refs = collectRefs(schema);
  refs.forEach((ref) => {
    expect(resolvePointer(schema, ref)).toBeDefined();
  });
  return refs;
};

describe('toolDefinitionToInference', () => {
  describe('$ref / $defs handling', () => {
    it('keeps $defs for Zod v4 schemas with registered (referenced) sub-schemas', () => {
      const timeRange = z4.object({ from: z4.string(), to: z4.string() }).meta({ id: 'TimeRange' });
      const schema = z4.object({
        primary: timeRange,
        secondary: timeRange.optional(),
      });

      const { tool } = toolDefinitionToInference([
        new DynamicStructuredTool({ name: 'tool', description: 'd', schema, func: async () => '' }),
      ]) as any;

      const refs = expectNoDanglingRefs(tool.schema);
      expect(refs.length).toBeGreaterThan(0);
      expect(tool.schema.$defs).toHaveProperty('TimeRange');
    });

    it('keeps $defs for recursive Zod v4 schemas', () => {
      const node: z4.ZodType = z4.object({
        name: z4.string(),
        get children() {
          return z4.array(node);
        },
      });
      const schema = z4.object({ tree: node.meta({ id: 'Node' }) });

      const { tool } = toolDefinitionToInference([
        new DynamicStructuredTool({ name: 'tool', description: 'd', schema, func: async () => '' }),
      ]) as any;

      const refs = expectNoDanglingRefs(tool.schema);
      expect(refs.length).toBeGreaterThan(0);
    });

    it('keeps $defs for plain JSON schema tool definitions', () => {
      const parameters = {
        type: 'object',
        properties: { range: { $ref: '#/$defs/TimeRange' } },
        required: ['range'],
        $defs: {
          TimeRange: { type: 'object', properties: { from: { type: 'string' } } },
        },
      };
      const definition = {
        type: 'function',
        function: { name: 'tool', description: 'd', parameters },
      } as unknown as ToolDefinition;

      const { tool } = toolDefinitionToInference([definition]) as any;

      expect(expectNoDanglingRefs(tool.schema)).toEqual(['#/$defs/TimeRange']);
    });

    it('keeps legacy `definitions` for plain JSON schema tool definitions', () => {
      const parameters = {
        type: 'object',
        properties: { range: { $ref: '#/definitions/TimeRange' } },
        definitions: {
          TimeRange: { type: 'object', properties: { from: { type: 'string' } } },
        },
      };
      const definition = {
        type: 'function',
        function: { name: 'tool', description: 'd', parameters },
      } as unknown as ToolDefinition;

      const { tool } = toolDefinitionToInference([definition]) as any;

      expect(expectNoDanglingRefs(tool.schema)).toEqual(['#/definitions/TimeRange']);
    });

    it('produces no dangling refs for reused Zod v3 sub-schemas', () => {
      const range = z3.object({ from: z3.string() });
      const schema = z3.object({ a: range, b: range });

      const { tool } = toolDefinitionToInference([
        new DynamicStructuredTool({ name: 'tool', description: 'd', schema, func: async () => '' }),
      ]) as any;

      expectNoDanglingRefs(tool.schema);
    });
  });
});

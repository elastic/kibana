/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
// zod v3 interop: @kbn/zod only re-exports v4, so the legacy v3 subpath is
// the only way to exercise the zod-to-json-schema branch
// eslint-disable-next-line @kbn/eslint/module_migration
import { z as z3 } from 'zod/v3';
import { tool } from '@langchain/core/tools';
import { toolDefinitionToInference } from './tools';

const timeRangeSchema = z
  .object({ from: z.string(), to: z.string() })
  .meta({ id: 'test-timeRangeSchema' });

const sharedTool = tool(async () => 'ok', {
  name: 'generate_dashboard',
  description: 'repro',
  schema: z.object({
    operations: z.array(
      z.discriminatedUnion('type', [
        z.object({ type: z.literal('set_metadata'), time_range: timeRangeSchema.optional() }),
        z.object({ type: z.literal('add_panel') }),
      ])
    ),
  }),
});

const resolve = (root: unknown, ref: string): unknown =>
  ref
    .slice(2)
    .split('/')
    .reduce<unknown>(
      (acc, k) => (acc == null ? undefined : (acc as Record<string, unknown>)[k]),
      root
    );

const collectRefs = (n: unknown, out: string[] = []): string[] => {
  if (n && typeof n === 'object') {
    for (const [k, v] of Object.entries(n as object)) {
      if (k === '$ref' && typeof v === 'string') out.push(v);
      else collectRefs(v, out);
    }
  }
  return out;
};

const expectAllRefsResolve = (schema: unknown) => {
  const refs = collectRefs(schema);
  expect(refs.length).toBeGreaterThan(0);
  for (const ref of refs) {
    expect(resolve(schema, ref)).toBeDefined();
  }
};

describe('toolDefinitionToInference preserves $defs', () => {
  it('keeps $defs so nested $refs remain resolvable (zod v4)', () => {
    const defs = toolDefinitionToInference([sharedTool]);
    expectAllRefsResolve(defs.generate_dashboard.schema);
  });

  it('keeps $defs for a plain JSON Schema tool definition', () => {
    // This mirrors what withStructuredOutput produces: the zod schema is
    // converted to JSON Schema up front (z4.toJSONSchema), so the tool
    // arrives at toolDefinitionToInference as a plain ToolDefinition whose
    // parameters are already plain JSON Schema with $defs + $refs.
    const converted = z.toJSONSchema(
      z.object({
        operations: z.array(
          z.discriminatedUnion('type', [
            z.object({ type: z.literal('set_metadata'), time_range: timeRangeSchema.optional() }),
            z.object({ type: z.literal('add_panel') }),
          ])
        ),
      }),
      { io: 'input' }
    );

    const defs = toolDefinitionToInference([
      {
        type: 'function',
        function: {
          name: 'extract',
          description: 'structured output',
          parameters: converted as unknown as Record<string, unknown>,
        },
      },
    ]);
    expectAllRefsResolve(defs.extract.schema);
  });

  it('keeps definitions for a zod v3 schema', () => {
    // LangChain's isZodSchema recognizes zod v3, so this exercises the
    // zod-to-json-schema branch of resolveToolSchema. A sub-schema used
    // twice makes zod-to-json-schema emit a $ref for the second use.
    const timeRange = z3.object({ from: z3.string(), to: z3.string() });
    const v3Tool = tool(async () => 'ok', {
      name: 'extract_v3',
      description: 'zod v3 input',
      schema: z3.object({
        start: timeRange,
        end: timeRange.optional(),
      }),
    });

    const defs = toolDefinitionToInference([v3Tool as never]);
    const schema = defs.extract_v3.schema as unknown as Record<string, unknown>;
    expectAllRefsResolve(schema);
    // when zod-to-json-schema dedupes into a definitions block, it must
    // survive the pick instead of leaving dangling $refs
    if (collectRefs(schema).some((ref) => ref.startsWith('#/definitions/'))) {
      expect(schema.definitions).toBeDefined();
    }
  });

  it('keeps $defs for a recursive schema', () => {
    interface Pet {
      name: string;
      kittens?: Pet[];
    }
    const petSchema = z.lazy(
      (): z.ZodType<Pet> => z.object({ name: z.string(), kittens: z.array(petSchema).optional() })
    );

    const converted = z.toJSONSchema(z.object({ pet: petSchema }), { io: 'input' });
    expect(JSON.stringify(converted)).toContain('#/$defs/__schema0');

    const defs = toolDefinitionToInference([
      {
        type: 'function',
        function: {
          name: 'walk',
          description: 'recursive',
          parameters: converted as unknown as Record<string, unknown>,
        },
      },
    ]);
    const schema = defs.walk.schema as unknown as Record<string, unknown>;
    const defsBlock = schema.$defs as Record<string, unknown>;
    expect(defsBlock).toBeDefined();
    expect(defsBlock.__schema0).toBeDefined();
    expectAllRefsResolve(schema);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connectorsSpecs } from '@kbn/connector-specs';
import { z } from '@kbn/zod/v4';
import type { ZodType } from '@kbn/zod/v4';
import { formatJsonSchemaForLlm, formatSchemaForLlm } from './schema_utils';

/** Same options the actions plugin uses to serialize action inputs (`serializeSpecDetail`). */
const toServedJsonSchema = (input: ZodType) =>
  z.toJSONSchema(input, { unrepresentable: 'any', io: 'input' }) as Record<string, unknown>;

describe('formatJsonSchemaForLlm parity with formatSchemaForLlm', () => {
  const actionCases = Object.values(connectorsSpecs).flatMap((spec) =>
    Object.entries(spec.actions).map(([name, def]) => ({
      label: `${spec.metadata.id}.${name}`,
      input: def.input,
    }))
  );

  it('covers at least one action', () => {
    expect(actionCases.length).toBeGreaterThan(0);
  });

  it.each(actionCases)('$label: params text is identical', ({ input }) => {
    expect(formatJsonSchemaForLlm(toServedJsonSchema(input))).toBe(formatSchemaForLlm(input));
  });
});

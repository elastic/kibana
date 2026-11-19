/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromJSONSchema } from '@kbn/zod/v4/from_json_schema';
import { repairJsonEncodedArguments } from './repair_json_encoded_arguments';

// The tool-call tests in validate_tool_calls.test.ts cover the repair through the public path.
// These cover the path shapes and partial failures that are awkward to reach from there.

const toZod = (schema: Record<string, unknown>) => {
  const zodSchema = fromJSONSchema(schema);
  if (!zodSchema) throw new Error('fromJSONSchema returned no schema');
  return zodSchema;
};

const verdictsSchema = toZod({
  type: 'object',
  properties: {
    verdicts: {
      type: 'array',
      items: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    },
    count: { type: 'number' },
  },
  required: ['verdicts'],
});

describe('repairJsonEncodedArguments', () => {
  it('repairs the whole arguments object when it was sent as a JSON string', () => {
    // Double-encoded arguments fail at the root path, which has no key to report.
    expect(
      repairJsonEncodedArguments(JSON.stringify({ verdicts: [{ id: 'a' }] }), verdictsSchema)
    ).toEqual({ repaired: { verdicts: [{ id: 'a' }] }, repairedPaths: ['<root>'] });
  });

  it('repairs array items by index and leaves the valid items as they are', () => {
    const valid = { id: 'b' };

    expect(
      repairJsonEncodedArguments(
        { verdicts: [JSON.stringify({ id: 'a' }), valid, JSON.stringify({ id: 'c' })] },
        verdictsSchema
      )
    ).toEqual({
      repaired: { verdicts: [{ id: 'a' }, valid, { id: 'c' }] },
      repairedPaths: ['verdicts.0', 'verdicts.2'],
    });
  });

  it('gives up when another failure remains that is not a JSON-encoded value', () => {
    // A partial repair must not be returned: the caller would otherwise accept arguments that
    // still break the schema.
    expect(
      repairJsonEncodedArguments(
        { verdicts: JSON.stringify([{ id: 'a' }]), count: 'three' },
        verdictsSchema
      )
    ).toBeUndefined();
  });

  it('gives up when the string parses to the wrong structure', () => {
    // An object where the schema expects an array is not a JSON-encoded array.
    expect(
      repairJsonEncodedArguments({ verdicts: JSON.stringify({ id: 'a' }) }, verdictsSchema)
    ).toBeUndefined();
  });

  it('gives up when a repaired value still fails inside', () => {
    expect(
      repairJsonEncodedArguments({ verdicts: JSON.stringify([{ id: 1 }]) }, verdictsSchema)
    ).toBeUndefined();
  });

  it('does not touch arguments that already validate', () => {
    const args = { verdicts: [{ id: 'a' }] };

    expect(repairJsonEncodedArguments(args, verdictsSchema)).toEqual({
      repaired: args,
      repairedPaths: [],
    });
  });
});

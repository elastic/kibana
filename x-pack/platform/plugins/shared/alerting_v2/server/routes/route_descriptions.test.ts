/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import { updateActionPolicyDataSchema, updateRuleDataSchema } from '@kbn/alerting-v2-schemas';
import {
  ACTION_POLICY_PATCH_SEMANTICS_DESCRIPTION,
  RULE_PATCH_SEMANTICS_DESCRIPTION,
} from './route_descriptions';

/** The worked examples are the backtick-fenced JSON objects in the prose. */
const extractJsonExamples = (description: string): string[] =>
  [...description.matchAll(/`(\{.*?\})`/g)].map(([, json]) => json);

describe('PATCH semantics descriptions', () => {
  /**
   * The bodies in the prose are copy-paste instructions, and every PATCH schema is strict, so an
   * example borrowed from another resource tells callers to send something that returns a 400.
   */
  describe.each([
    ['rule', RULE_PATCH_SEMANTICS_DESCRIPTION, updateRuleDataSchema],
    ['action policy', ACTION_POLICY_PATCH_SEMANTICS_DESCRIPTION, updateActionPolicyDataSchema],
  ])('%s', (_resource, description, schema: z.ZodType) => {
    const examples = extractJsonExamples(description);

    it('documents three examples', () => {
      expect(examples).toHaveLength(3);
    });

    it.each(examples)('accepts %s as a request body', (json) => {
      expect(schema.safeParse(JSON.parse(json))).toMatchObject({ success: true });
    });
  });
});

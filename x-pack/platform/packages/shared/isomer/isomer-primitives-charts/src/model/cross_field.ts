/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// `z.toJSONSchema` drops refinements, so each one here names the sentence a description in the authoring schema states its rule in; `src/stated_rules.test.ts` checks both.

import { z } from '@elastic/isomer-sdk';

const always = () => true;

type RefineParams = Exclude<Parameters<typeof z.refine>[1], string | undefined>;

/** `rule` is the sentence, word for word, that a description the authoring JSON Schema keeps states the check in. */
type StatedParams = RefineParams & { rule: string };

const statedRules = new WeakMap<object, readonly string[]>();

const stated = <C extends object>(check: C, rules: readonly string[]): C => {
  statedRules.set(check, rules);
  return check;
};

/** The rules a check from this module states, or `undefined` for any other check. */
export const rulesOf = (check: object): readonly string[] | undefined => statedRules.get(check);

/** A `.check()` rule on one field, stated in the authoring schema. */
export const statedRefine = <T>(
  check: (value: NoInfer<T>) => boolean,
  { rule, ...params }: StatedParams
) => stated(z.refine<T>(check, params), [rule]);

/** A `.check()` rule that runs even after a field fails, so one validation reports both. */
export const crossRefine = <T>(
  check: (value: NoInfer<T>) => boolean,
  { rule, ...params }: StatedParams
) =>
  stated(
    z.refine<T>(
      (value) => {
        try {
          return check(value);
        } catch {
          // Unreadable input passes; the field that broke it reports the error.
          return true;
        }
      },
      { ...params, when: always }
    ),
    [rule]
  );

/** {@link crossRefine} for a check that adds its own issues, one stated rule for each kind it raises. */
export const crossSuperRefine = <T>(
  refine: (value: T, context: z.core.$RefinementCtx<T>) => void,
  rules: readonly [string, ...string[]]
) =>
  stated(
    z.superRefine<T>(
      (value, context) => {
        try {
          refine(value, context);
        } catch {
          // Unreadable input passes; the field that broke it reports the error.
        }
      },
      { when: always }
    ),
    rules
  );

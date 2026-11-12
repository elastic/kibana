/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { validateTailSamplingRoute } from './validate_tail_sampling';
import { saveTailSamplingRoute } from './save_tail_sampling';
import {
  MAX_TAIL_SAMPLING_HASH_LENGTH,
  MAX_TAIL_SAMPLING_POLICIES,
  MAX_TAIL_SAMPLING_POLICY_NAME_LENGTH,
} from './types';

const keepErrors = {
  name: 'keep-errors',
  type: 'status_code',
  status_code: { status_codes: ['ERROR'] },
};
const settings = (policies: unknown[]) => ({
  processor: 'tail_sampling',
  config: { policies },
});
const hash = 'a'.repeat(64);

describe('validateTailSamplingRoute params', () => {
  it('accepts a policy and keeps its type block', () => {
    const result = validateTailSamplingRoute.params!.safeParse({
      body: settings([keepErrors]),
    });
    expectParseSuccess(result);
    expect(result.data?.body.config.policies[0]).toEqual(keepErrors);
  });

  it('accepts an empty list, so the handler can report it as a diagnostic', () => {
    expectParseSuccess(validateTailSamplingRoute.params!.safeParse({ body: settings([]) }));
  });

  it('rejects an unknown processor', () => {
    expectParseError(
      validateTailSamplingRoute.params!.safeParse({
        body: { processor: 'adaptive_tail_sampling', config: { policies: [keepErrors] } },
      })
    );
  });

  it('rejects a body without a processor', () => {
    expectParseError(
      validateTailSamplingRoute.params!.safeParse({ body: { config: { policies: [keepErrors] } } })
    );
  });

  it('rejects a policy without a type', () => {
    expectParseError(
      validateTailSamplingRoute.params!.safeParse({ body: settings([{ name: 'no-type' }]) })
    );
  });

  it('rejects a name over the length limit', () => {
    expectParseError(
      validateTailSamplingRoute.params!.safeParse({
        body: settings([
          { ...keepErrors, name: 'x'.repeat(MAX_TAIL_SAMPLING_POLICY_NAME_LENGTH + 1) },
        ]),
      })
    );
  });

  it('rejects more than the maximum number of policies', () => {
    const policies = Array.from({ length: MAX_TAIL_SAMPLING_POLICIES + 1 }, (_, i) => ({
      ...keepErrors,
      name: `p-${i}`,
    }));
    expectParseError(validateTailSamplingRoute.params!.safeParse({ body: settings(policies) }));
  });
});

describe('saveTailSamplingRoute params', () => {
  it('accepts a config with a validated hash', () => {
    expectParseSuccess(
      saveTailSamplingRoute.params!.safeParse({
        body: { ...settings([keepErrors]), validatedHash: hash },
      })
    );
  });

  it('rejects a save without a validated hash', () => {
    expectParseError(saveTailSamplingRoute.params!.safeParse({ body: settings([keepErrors]) }));
  });

  it('accepts the version of the stored document', () => {
    expectParseSuccess(
      saveTailSamplingRoute.params!.safeParse({
        body: { ...settings([keepErrors]), validatedHash: hash, version: 'WzEsMV0=' },
      })
    );
  });

  it('rejects a version over the length limit', () => {
    expectParseError(
      saveTailSamplingRoute.params!.safeParse({
        body: { ...settings([keepErrors]), validatedHash: hash, version: 'v'.repeat(129) },
      })
    );
  });

  it('rejects an empty or oversized hash', () => {
    expectParseError(
      saveTailSamplingRoute.params!.safeParse({
        body: { ...settings([keepErrors]), validatedHash: '' },
      })
    );
    expectParseError(
      saveTailSamplingRoute.params!.safeParse({
        body: {
          ...settings([keepErrors]),
          validatedHash: 'h'.repeat(MAX_TAIL_SAMPLING_HASH_LENGTH + 1),
        },
      })
    );
  });
});

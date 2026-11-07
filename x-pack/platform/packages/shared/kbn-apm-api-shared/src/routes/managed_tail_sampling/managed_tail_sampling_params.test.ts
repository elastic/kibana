/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { validateManagedTailSamplingRoute } from './validate_managed_tail_sampling';
import { saveManagedTailSamplingRoute } from './save_managed_tail_sampling';
import { MAX_TAIL_SAMPLING_POLICIES, MAX_TAIL_SAMPLING_POLICY_NAME_LENGTH } from './types';

const keepErrors = {
  name: 'keep-errors',
  type: 'status_code',
  status_code: { status_codes: ['ERROR'] },
};
const hash = 'a'.repeat(64);

describe('validateManagedTailSamplingRoute params', () => {
  it('accepts a policy and keeps its type block', () => {
    const result = validateManagedTailSamplingRoute.params!.safeParse({
      body: { policies: [keepErrors] },
    });
    expectParseSuccess(result);
    expect(result.data?.body.policies[0]).toEqual(keepErrors);
  });

  it('accepts an empty list, so the handler can report it as a diagnostic', () => {
    expectParseSuccess(
      validateManagedTailSamplingRoute.params!.safeParse({ body: { policies: [] } })
    );
  });

  it('rejects a policy without a type', () => {
    expectParseError(
      validateManagedTailSamplingRoute.params!.safeParse({
        body: { policies: [{ name: 'no-type' }] },
      })
    );
  });

  it('rejects a name over the length limit', () => {
    expectParseError(
      validateManagedTailSamplingRoute.params!.safeParse({
        body: {
          policies: [{ ...keepErrors, name: 'x'.repeat(MAX_TAIL_SAMPLING_POLICY_NAME_LENGTH + 1) }],
        },
      })
    );
  });

  it('rejects more than the maximum number of policies', () => {
    const policies = Array.from({ length: MAX_TAIL_SAMPLING_POLICIES + 1 }, (_, i) => ({
      ...keepErrors,
      name: `p-${i}`,
    }));
    expectParseError(validateManagedTailSamplingRoute.params!.safeParse({ body: { policies } }));
  });
});

describe('saveManagedTailSamplingRoute params', () => {
  it('accepts policies with a validated hash', () => {
    expectParseSuccess(
      saveManagedTailSamplingRoute.params!.safeParse({
        body: { policies: [keepErrors], validatedHash: hash },
      })
    );
  });

  it('rejects a save without a validated hash', () => {
    expectParseError(
      saveManagedTailSamplingRoute.params!.safeParse({ body: { policies: [keepErrors] } })
    );
  });

  it('rejects a hash of the wrong length', () => {
    expectParseError(
      saveManagedTailSamplingRoute.params!.safeParse({
        body: { policies: [keepErrors], validatedHash: 'abc' },
      })
    );
  });
});

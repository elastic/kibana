/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { INFERENCE_ID_MAX_LENGTH, isValidInferenceId, validateInferenceId } from './inference_id';

describe('isValidInferenceId', () => {
  it.each(Object.values(defaultInferenceEndpoints))('accepts the default endpoint %s', (id) => {
    expect(isValidInferenceId(id)).toBe(true);
  });

  it.each(['my-custom_endpoint.v2', '.any-inference-id'])(
    'accepts the custom endpoint %s',
    (id) => {
      expect(isValidInferenceId(id)).toBe(true);
    }
  );

  it.each([
    ['a comma-separated list', '.multilingual-e5-small-elasticsearch,.kibana_9.6.0_001'],
    ['a wildcard', '.multilingual-e5-small-elasticsearch*'],
    ['uppercase letters', '.AnyInferenceId'],
    ['a space', 'my endpoint'],
    ['a slash', 'my/endpoint'],
    ['an empty string', ''],
  ])('rejects %s', (_, id) => {
    expect(isValidInferenceId(id)).toBe(false);
  });

  it('rejects ids longer than the max length', () => {
    expect(isValidInferenceId('a'.repeat(INFERENCE_ID_MAX_LENGTH))).toBe(true);
    expect(isValidInferenceId('a'.repeat(INFERENCE_ID_MAX_LENGTH + 1))).toBe(false);
  });
});

describe('validateInferenceId', () => {
  it('returns undefined for a valid id', () => {
    expect(validateInferenceId(defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL)).toBeUndefined();
  });

  it('returns an error message for an invalid id', () => {
    expect(validateInferenceId('a,b')).toEqual(expect.stringContaining('inferenceId must be'));
  });
});

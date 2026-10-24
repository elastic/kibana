/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValidationFuncArg } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { extraBodyDeserializer, extraBodySerializer, extraBodyValidator } from './extra_body';

const validate = (value: string) =>
  extraBodyValidator({ value } as ValidationFuncArg<any, string>) as
    | { message: string }
    | undefined;

describe('extraBody form helpers', () => {
  it('round-trips an object through the deserializer and serializer', () => {
    const extraBody = { chat_template_kwargs: { enable_thinking: false } };
    expect(extraBodySerializer(extraBodyDeserializer(extraBody))).toEqual(extraBody);
  });

  it('maps empty values to undefined so nothing is persisted', () => {
    expect(extraBodyDeserializer(undefined)).toBe('');
    expect(extraBodyDeserializer({})).toBe('');
    expect(extraBodySerializer('')).toBeUndefined();
    expect(extraBodySerializer('   ')).toBeUndefined();
    expect(extraBodySerializer('{}')).toBeUndefined();
  });

  it('accepts an empty value and a JSON object', () => {
    expect(validate('')).toBeUndefined();
    expect(validate('{ "chat_template_kwargs": { "enable_thinking": false } }')).toBeUndefined();
  });

  it.each(['{ not json', '[1, 2]', '"text"', '42'])('rejects %s', (value) => {
    expect(validate(value)?.message).toBe('Additional request body must be a JSON object.');
  });

  it('rejects protected keys', () => {
    expect(validate('{ "model": "x", "stream": true, "top_k": 20 }')?.message).toBe(
      'Additional request body cannot set model, stream.'
    );
  });
});

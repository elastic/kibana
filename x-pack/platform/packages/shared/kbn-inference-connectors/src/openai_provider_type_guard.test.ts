/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OpenAiProviderType } from '@kbn/connector-schemas/openai';
import { isOpenAiProviderType } from './openai_provider_type_guard';

describe('isOpenAiProviderType', () => {
  it.each(Object.values(OpenAiProviderType))('accepts %s', (provider) => {
    expect(isOpenAiProviderType(provider)).toBe(true);
  });

  it('rejects arbitrary strings', () => {
    expect(isOpenAiProviderType('not-a-provider')).toBe(false);
  });

  it('rejects non-strings', () => {
    expect(isOpenAiProviderType(1)).toBe(false);
    expect(isOpenAiProviderType(null)).toBe(false);
  });
});

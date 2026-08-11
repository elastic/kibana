/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OpenAiProviderType } from '@kbn/connector-schemas/openai';

const OPENAI_PROVIDER_VALUES = new Set<string>(Object.values(OpenAiProviderType));

export const isOpenAiProviderType = (value: unknown): value is OpenAiProviderType =>
  typeof value === 'string' && OPENAI_PROVIDER_VALUES.has(value);

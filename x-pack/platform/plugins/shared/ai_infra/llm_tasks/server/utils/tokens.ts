/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode, decode } from 'gpt-tokenizer';

export const count = (text: string): number => {
  return encode(text).length;
};

export const truncate = (text: string, maxTokens: number): string => {
  const encoded = encode(text);
  if (encoded.length > maxTokens) {
    const truncated = encoded.slice(0, maxTokens);
    return decode(truncated);
  }
  return text;
};

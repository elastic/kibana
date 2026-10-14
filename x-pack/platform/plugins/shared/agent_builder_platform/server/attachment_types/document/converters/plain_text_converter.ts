/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { documentErrors } from '../errors';
import type { DocumentConverter } from './types';

export const createPlainTextConverter = (): DocumentConverter => ({
  isAvailable: () => true,
  toText: async ({ bytes }) => {
    let text: string;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      throw documentErrors.notUtf8();
    }
    // UTF-16 files are often valid UTF-8 bytes, but full of NUL characters
    if (text.includes('\u0000')) {
      throw documentErrors.notUtf8();
    }
    return text;
  },
});

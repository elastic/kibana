/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setTimeout as sleep } from 'timers/promises';
import { pdfErrors } from './errors';

const DEFAULT_DELAY_MS = 2000;
const SLOW_DELAY_MS = 30 * 1000;

/**
 * Pretends to read a PDF. A file named `error` fails and a file named `slow` waits 30 s.
 */
export const fakeExtractDocument = async ({
  fileName,
  signal,
}: {
  fileName: string;
  signal?: AbortSignal;
}): Promise<string> => {
  const name = fileName.replace(/\.pdf$/i, '');
  if (name === 'error') {
    throw pdfErrors.extractionFailed();
  }
  await sleep(name === 'slow' ? SLOW_DELAY_MS : DEFAULT_DELAY_MS, undefined, { signal });
  return '# Fake PDF\n\nThe PDF contains one word: Hello';
};

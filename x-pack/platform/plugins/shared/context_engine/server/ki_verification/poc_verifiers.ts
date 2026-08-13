/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KiVerifier } from './types';

const MIN_CONTENT_LENGTH = 20;

/**
 * POC verifiers so the Verify KI workflow step has real checks to run; replace with production
 * verifiers as they land.
 */
export const pocVerifiers: KiVerifier[] = [
  {
    id: 'has-title',
    applies: () => true,
    verify: async (ki) =>
      ki.title?.trim() ? { passed: true } : { passed: false, reason: 'KI has no title' },
  },
  {
    id: 'min-content',
    applies: (ki) => ki.content !== undefined,
    verify: async (ki) =>
      (ki.content ?? '').trim().length >= MIN_CONTENT_LENGTH
        ? { passed: true }
        : {
            passed: false,
            reason: `KI content is shorter than ${MIN_CONTENT_LENGTH} characters`,
          },
  },
];

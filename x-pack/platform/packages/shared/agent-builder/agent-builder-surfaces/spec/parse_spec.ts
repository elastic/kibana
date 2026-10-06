/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition } from '@elastic/isomer-sdk';
import { createCompositionParser, formatValidationError } from '@elastic/isomer-sdk';
import { specDefinitions } from './pack';

export type ParseSpecResult =
  | { valid: true; spec: Composition }
  | { valid: false; errors: string[] };

const parser = createCompositionParser(specDefinitions);

/**
 * Validates an untrusted spec, such as one written by the agent, against the Agent Builder pack.
 */
export const parseSpec = (value: unknown): ParseSpecResult => {
  const { valid, errors, composition } = parser(value);

  if (!valid || !composition) {
    return { valid: false, errors: errors.map(formatValidationError) };
  }

  return { valid: true, spec: composition };
};

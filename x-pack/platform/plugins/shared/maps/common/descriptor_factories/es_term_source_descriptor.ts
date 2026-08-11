/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SOURCE_TYPES } from '../constants';
import type { ESTermSourceDescriptor } from '../descriptor_types';

export function createEsTermSourceDescriptor(
  descriptor: Partial<ESTermSourceDescriptor>
): ESTermSourceDescriptor {
  return {
    type: SOURCE_TYPES.ES_TERM_SOURCE,
    ...descriptor,
  } as ESTermSourceDescriptor;
}

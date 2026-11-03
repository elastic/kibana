/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { builtinBrowserToolDescriptors } from '@kbn/agent-builder-common';

/** Description shared with the server-side descriptor, so both never diverge. */
export const getBuiltinDescription = (id: string): string => {
  const descriptor = builtinBrowserToolDescriptors.find((d) => d.id === id);
  if (!descriptor) {
    throw new Error(`Unknown builtin browser tool "${id}"`);
  }
  return descriptor.description;
};

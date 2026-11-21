/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObservableMetadataFilter } from '../../../common/types/api';

/**
 * Reads a metadata filter typed in the observables list: `key` keeps values that hold the key,
 * `key:value` keeps the ones whose value matches ignoring case, and `key:value*` the ones whose
 * value starts with it. Returns undefined for input that is not a filter.
 */
export const parseMetadataFilter = (input: string): ObservableMetadataFilter | undefined => {
  const trimmed = input.trim();
  const separator = trimmed.indexOf(':');
  const key = (separator === -1 ? trimmed : trimmed.slice(0, separator)).trim();
  const rest = separator === -1 ? '' : trimmed.slice(separator + 1).trim();

  if (key.length === 0 || key.includes('*')) {
    return;
  }

  if (rest.length === 0) {
    return { key };
  }

  if (rest.endsWith('*')) {
    const prefix = rest.slice(0, -1);
    return prefix.length > 0 ? { key, prefix } : { key };
  }

  return { key, value: rest };
};

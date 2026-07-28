/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ListenerFilter } from './types';

interface MatchableEvent {
  type: string;
  attributes: Record<string, string>;
}

/**
 * Decides whether an event is relevant to a listener. This runs once per
 * (event x candidate listener) on the ingesting node, which is what keeps the
 * firehose off the listeners that do not care about it.
 */
export const matchesFilter = (filter: ListenerFilter, event: MatchableEvent): boolean => {
  if (!filter.types.includes(event.type)) {
    return false;
  }

  if (!filter.attributes) {
    return true;
  }

  return Object.entries(filter.attributes).every(([key, expected]) => {
    const actual = event.attributes[key];
    if (actual === undefined) {
      return false;
    }
    return Array.isArray(expected) ? expected.includes(actual) : actual === expected;
  });
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { replaceEqualDeep } from '@kbn/react-query';
import type { TimelineItem } from './types';

/**
 * Keeps the previous object of every item whose content did not change, matched by key.
 * Helps to avoid re-rendering all the items on every streamed event.
 */
export const reuseUnchangedItems = (
  previous: readonly TimelineItem[],
  next: TimelineItem[]
): TimelineItem[] => {
  const previousByKey = new Map(previous.map((item) => [item.key, item]));
  return next.map((item) => replaceEqualDeep(previousByKey.get(item.key), item));
};

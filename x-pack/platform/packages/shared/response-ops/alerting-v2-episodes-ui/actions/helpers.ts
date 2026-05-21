/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from './translations';

export const uniqueByGroup = <T extends { group_hash: string }>(items: T[]): T[] => {
  const seen = new Set<string>();
  return items.filter((x) => (seen.has(x.group_hash) ? false : (seen.add(x.group_hash), true)));
};

export const successOrPartialToast = (
  processed: number,
  total: number
): { title: string; color: 'success' | 'warning' } =>
  processed === total
    ? { title: i18n.getBulkSuccessToast(processed), color: 'success' }
    : { title: i18n.getBulkPartialSuccessToast(processed, total), color: 'warning' };

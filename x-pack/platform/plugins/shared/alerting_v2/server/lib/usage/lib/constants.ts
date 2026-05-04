/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { NameValuePair } from '../types';
import type { TermsBucket } from './types';

export const TERMS_SIZE = 100;

export const bucketsToRecord = <K extends string = string>(
  buckets: TermsBucket[] = []
): Partial<Record<K, number>> => {
  return buckets.reduce<Partial<Record<K, number>>>((acc, { key, doc_count: count }) => {
    acc[key as K] = count;
    return acc;
  }, {});
};

export const bucketsToArray = (buckets: TermsBucket[] = []): NameValuePair[] =>
  buckets.map(({ key: name, doc_count: value }) => ({ name, value }));

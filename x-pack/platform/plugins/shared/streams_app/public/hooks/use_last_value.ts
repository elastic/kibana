/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef } from 'react';

/**
 * The value, or the last one that it had when it has none, so a caller can show the previous result
 * while the next one loads. A value that is older than `maxAgeMs` is dropped, so an old result is
 * not shown as if it were current.
 */
export const useLastValue = <T>(
  value: T | undefined,
  { maxAgeMs }: { maxAgeMs: number }
): T | undefined => {
  const last = useRef<{ value: T; receivedAt: number }>();

  if (value !== undefined && last.current?.value !== value) {
    last.current = { value, receivedAt: Date.now() };
  }

  if (value !== undefined) return value;

  const { current } = last;
  return current && Date.now() - current.receivedAt < maxAgeMs ? current.value : undefined;
};

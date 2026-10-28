/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef } from 'react';

/** Keeps stable React keys for list rows while items are added, moved and removed. */
export const useRowKeys = (count: number) => {
  const nextKey = useRef(0);
  const keys = useRef<number[]>([]);
  while (keys.current.length < count) {
    keys.current.push(nextKey.current++);
  }
  if (keys.current.length > count) {
    keys.current = keys.current.slice(0, count);
  }
  return {
    keys: keys.current,
    remove: (index: number) => {
      keys.current = keys.current.filter((_, position) => position !== index);
    },
    move: (from: number, to: number) => {
      const next = [...keys.current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      keys.current = next;
    },
  };
};

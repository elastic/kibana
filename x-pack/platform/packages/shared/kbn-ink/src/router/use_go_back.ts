/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useInput } from 'ink';
import { useInkRouter } from './use_ink_router';

/**
 * Go back one level (or rather, "up" one level).
 */
export function useGoBack() {
  const { back } = useInkRouter();

  useInput((input, key) => {
    if (input === 'q') {
      back();
    }
  });
}

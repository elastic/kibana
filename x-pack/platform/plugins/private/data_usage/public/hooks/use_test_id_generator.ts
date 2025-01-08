/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';

export const useTestIdGenerator = (prefix?: string): ((suffix?: string) => string | undefined) => {
  return useCallback(
    (suffix: string = ''): string | undefined => {
      if (prefix) {
        return `${prefix}${suffix ? `-${suffix}` : ''}`;
      }
    },
    [prefix]
  );
};

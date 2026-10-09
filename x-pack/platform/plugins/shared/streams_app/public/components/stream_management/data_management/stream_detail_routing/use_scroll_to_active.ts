/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';

export const useScrollToActive = <T extends HTMLElement = HTMLElement>(isActive?: boolean) => {
  return useCallback(
    (ref: T | null) => {
      if (ref && isActive) {
        requestAnimationFrame(() => {
          ref.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
          });
        });
      }
    },
    [isActive]
  );
};

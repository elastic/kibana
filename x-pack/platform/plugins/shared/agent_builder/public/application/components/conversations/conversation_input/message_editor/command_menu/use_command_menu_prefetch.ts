/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef } from 'react';
import { usePrefetchSkills } from './menus/skills/use_prefetch_skills';

/**
 * Prefetches data for all command menus on first invocation.
 * Returns a callback that should be called when the editor receives focus.
 */
export const useCommandMenuPrefetch = () => {
  const hasPrefetched = useRef(false);
  const prefetchSkills = usePrefetchSkills();

  return useCallback(() => {
    if (hasPrefetched.current) {
      return;
    }
    hasPrefetched.current = true;
    prefetchSkills();
  }, [prefetchSkills]);
};

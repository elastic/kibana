/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { TARGET_LOOKUP_DEBOUNCE_MS } from '../constants';

interface UseTargetIdSearchStateParams {
  targetId: string;
}

export const useTargetIdSearchState = ({ targetId }: UseTargetIdSearchStateParams) => {
  const [targetIdSearchValue, setTargetIdSearchValue] = useState(targetId);
  const [debouncedTargetSearchValue, setDebouncedTargetSearchValue] = useState(targetId);

  useEffect(() => {
    setTargetIdSearchValue(targetId);
    setDebouncedTargetSearchValue(targetId);
  }, [targetId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedTargetSearchValue(targetIdSearchValue);
    }, TARGET_LOOKUP_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [targetIdSearchValue]);

  return {
    targetIdSearchValue,
    debouncedTargetSearchValue,
    setTargetIdSearchValue,
  };
};

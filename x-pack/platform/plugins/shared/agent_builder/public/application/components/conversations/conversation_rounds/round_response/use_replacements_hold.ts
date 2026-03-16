/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';

interface UseReplacementsHoldParams {
  holdEnabled: boolean;
  holdMaxMs: number;
  hasHttp: boolean;
  replacementsId?: string;
  isResolvingReplacements: boolean;
}

export const useReplacementsHold = ({
  holdEnabled,
  holdMaxMs,
  hasHttp,
  replacementsId,
  isResolvingReplacements,
}: UseReplacementsHoldParams): boolean => {
  const [hasExceededHoldLimit, setHasExceededHoldLimit] = useState(false);

  useEffect(() => {
    setHasExceededHoldLimit(false);
  }, [replacementsId, holdEnabled]);

  useEffect(() => {
    if (!holdEnabled || !hasHttp || !replacementsId || !isResolvingReplacements) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setHasExceededHoldLimit(true);
    }, holdMaxMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [holdEnabled, hasHttp, replacementsId, isResolvingReplacements, holdMaxMs]);

  return useMemo(
    () =>
      Boolean(
        holdEnabled && hasHttp && replacementsId && isResolvingReplacements && !hasExceededHoldLimit
      ),
    [holdEnabled, hasHttp, replacementsId, isResolvingReplacements, hasExceededHoldLimit]
  );
};

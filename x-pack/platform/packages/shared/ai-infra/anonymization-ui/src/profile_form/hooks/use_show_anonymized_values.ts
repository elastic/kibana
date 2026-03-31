/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';

export const useShowAnonymizedValues = (initialValue = false) => {
  const [showAnonymizedValues, setShowAnonymizedValues] = useState(initialValue);

  const toggle = useCallback(() => {
    setShowAnonymizedValues((prev) => !prev);
  }, []);

  return useMemo(
    () => ({
      showAnonymizedValues,
      setShowAnonymizedValues,
      toggle,
    }),
    [showAnonymizedValues, toggle]
  );
};

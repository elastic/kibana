/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';

/**
 * Remounts an EuiFlyout after EUI unregisters it (closeAllFlyouts / goBack)
 * so a stacked session can keep the panel in the history while a confirm
 * modal is open.
 */
export const useEuiFlyoutReregister = (): {
  flyoutKey: number;
  reregister: () => void;
} => {
  const [flyoutKey, setFlyoutKey] = useState(0);
  const reregister = useCallback(() => {
    setFlyoutKey((key) => key + 1);
  }, []);
  return { flyoutKey, reregister };
};

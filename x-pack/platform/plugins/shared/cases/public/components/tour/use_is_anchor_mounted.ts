/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

/**
 * Tracks whether an element matching the given CSS selector is currently mounted in the DOM.
 * Used to guard tour steps anchored by `data-test-subj` so a popover only renders once its
 * anchor exists (e.g. after the app header menu or a lazily-rendered panel has mounted).
 */
export const useIsAnchorMounted = (selector: string): boolean => {
  const [isMounted, setIsMounted] = useState<boolean>(
    () => typeof document !== 'undefined' && !!document.querySelector(selector)
  );

  useEffect(() => {
    const check = () => setIsMounted(!!document.querySelector(selector));

    // Run once in case the element mounted between the initial state and the effect.
    check();

    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [selector]);

  return isMounted;
};

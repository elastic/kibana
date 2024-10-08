/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MutableRefObject, useEffect, useRef } from 'react';

/**
 * Hook that returns a ref that is true when mounted and false when unmounted.
 *
 * Main use case is to avoid setting state on an unmounted component.
 */
export const useIsMounted = (): { isMountedRef: MutableRefObject<boolean> } => {
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return { isMountedRef };
};

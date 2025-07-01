/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useState, useEffect } from 'react';
import debounce from 'lodash/debounce';

export type VerticalBreakpoint = 'short' | 'medium' | 'tall';

export function useVerticalBreakpoint(): VerticalBreakpoint {
  const [height, setHeight] = useState(() => window.innerHeight);
  const handleResizeRef = useRef<((event: UIEvent) => void) & { cancel: () => void }>();

  useEffect(() => {
    const handleResize = debounce(() => {
      const newHeight = window.innerHeight;
      setHeight((prev) => (prev !== newHeight ? newHeight : prev));
    }, 75) as ((event: UIEvent) => void) & { cancel: () => void };
    handleResizeRef.current = handleResize;
    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      handleResize.cancel();
    };
  }, []);

  if (height < 600) return 'short';
  if (height < 1100) return 'medium';
  return 'tall';
}

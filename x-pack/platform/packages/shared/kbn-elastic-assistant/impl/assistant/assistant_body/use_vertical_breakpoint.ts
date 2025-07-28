/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import useRafState from 'react-use/lib/useRafState';

export type VerticalBreakpoint = 'short' | 'medium' | 'tall';

export function useVerticalBreakpoint(): VerticalBreakpoint {
  const [height, setHeight] = useRafState(() => window.innerHeight);

  useEffect(() => {
    const handleResize = () => {
      const newHeight = window.innerHeight;
      setHeight((prev) => (prev !== newHeight ? newHeight : prev));
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [setHeight]);

  if (height < 600) return 'short';
  if (height < 1100) return 'medium';
  return 'tall';
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef } from 'react';
import useWindowSize from 'react-use/lib/useWindowSize';

export function useRefDimensions() {
  const ref = useRef<HTMLDivElement>(null);
  // Subscribe to the full window size so any resize (width or height change)
  // triggers re-measurement of the container's bounding rect.
  const windowSize = useWindowSize();

  if (!ref.current) {
    return { ref, width: 0, height: 0 };
  }

  const { top, width } = ref.current.getBoundingClientRect();
  const height = windowSize.height - top;

  return { ref, width, height };
}

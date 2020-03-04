/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useRef } from 'react';
import { useWindowSize } from 'react-use';

export function useRefDimensions() {
  const ref = useRef<HTMLDivElement>(null);
  const windowHeight = useWindowSize().height;

  if (!ref.current) {
    return { ref, width: 0, height: 0 };
  }

  const { top, width } = ref.current.getBoundingClientRect();
  const height = windowHeight - top;

  return { ref, width, height };
}

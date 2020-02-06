/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { MutableRefObject, useRef } from 'react';
import { useWindowSize } from 'react-use';

export function useRefHeight(): [
  MutableRefObject<HTMLDivElement | null>,
  number
] {
  const ref = useRef<HTMLDivElement>(null);
  const windowHeight = useWindowSize().height;
  const topOffset = ref.current?.getBoundingClientRect()?.top ?? 0;

  const height = ref.current ? windowHeight - topOffset : 0;

  return [ref, height];
}

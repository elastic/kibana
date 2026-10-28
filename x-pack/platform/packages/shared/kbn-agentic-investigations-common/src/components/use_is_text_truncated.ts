/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useResizeObserver } from '@elastic/eui';

/**
 * Whether a single-line, `text-overflow: ellipsis` element is currently clipping its text, so a
 * tooltip with the full text is only offered when there is actually something hidden.
 * Re-measures when the element resizes or `text` changes.
 */
export const useIsTextTruncated = (element: HTMLElement | null, text: string): boolean => {
  const { width } = useResizeObserver(element, 'width');
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    setIsTruncated(element ? element.scrollWidth > element.clientWidth : false);
  }, [element, width, text]);

  return isTruncated;
};

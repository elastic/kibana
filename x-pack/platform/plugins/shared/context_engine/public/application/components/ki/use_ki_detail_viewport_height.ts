/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLayoutEffect, useRef, useState } from 'react';

export const MIN_KI_DETAIL_VIEWPORT_HEIGHT = 200;
export const KI_DETAIL_CONTENT_EDIT_BOTTOM_OFFSET = 88;
export const KI_DETAIL_RAW_JSON_BOTTOM_OFFSET = 24;

export const useKiDetailViewportHeight = (
  enabled = true,
  bottomOffset = KI_DETAIL_CONTENT_EDIT_BOTTOM_OFFSET
) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();

  useLayoutEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const updateHeight = () => {
      const top = containerRef.current?.getBoundingClientRect().top ?? 0;
      const nextHeight = window.innerHeight - top - bottomOffset;
      setHeight(Math.max(MIN_KI_DETAIL_VIEWPORT_HEIGHT, nextHeight));
    };

    updateHeight();
    const frameId = requestAnimationFrame(updateHeight);
    window.addEventListener('resize', updateHeight);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', updateHeight);
    };
  }, [enabled, bottomOffset]);

  return { containerRef, height };
};

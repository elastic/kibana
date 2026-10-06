/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';

const MIN_EDITOR_HEIGHT = 200;
const VIEWPORT_BOTTOM_OFFSET = 24;

export const useKiDetailViewportHeight = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();

  useEffect(() => {
    const updateHeight = () => {
      const top = containerRef.current?.getBoundingClientRect().top ?? 0;
      const nextHeight = window.innerHeight - top - VIEWPORT_BOTTOM_OFFSET;
      setHeight(Math.max(MIN_EDITOR_HEIGHT, nextHeight));
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  return { containerRef, height };
};

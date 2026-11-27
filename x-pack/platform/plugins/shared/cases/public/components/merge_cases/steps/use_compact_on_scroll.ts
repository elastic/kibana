/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

/**
 * Whether a bar above `scroller` should go compact: once the content scrolls, and until it is back
 * at the top. It only starts when there is more to scroll than going compact frees (`saving`), so
 * the content can't run out of scroll, jump back to the top and grow the bar again.
 */
export const useCompactOnScroll = (scroller: HTMLElement | null, saving: number): boolean => {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    setIsCompact(false);
    if (scroller == null) {
      return;
    }

    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scroller;
      setIsCompact((current) => scrollTop > 0 && (current || scrollHeight - clientHeight > saving));
    };

    onScroll();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, [scroller, saving]);

  return isCompact;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLayoutEffect, useState } from 'react';

/**
 * Returns whether `sizer` (typically a nowrap copy of the longest content) currently
 * fits within `container`. Independent of live wrapping so layout modes cannot oscillate.
 */
export const useNowrapFitsContainer = (
  container: HTMLElement | null,
  sizer: HTMLElement | null
): boolean => {
  const [fits, setFits] = useState(true);

  useLayoutEffect(() => {
    if (!container || !sizer) {
      return;
    }

    const update = () => {
      setFits(sizer.scrollWidth <= container.clientWidth);
    };

    update();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(update);
    observer.observe(container);
    observer.observe(sizer);

    return () => observer.disconnect();
  }, [container, sizer]);

  return fits;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect } from 'react';

export const scrollToTop = () => {
  useEffect(() => {
    // trying to use new API - https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollTo
    if (window.scroll) {
      window.scroll({
        top: 0,
        left: 0,
      });
    } else {
      // just a fallback for older browsers
      window.scrollTo(0, 0);
    }
  });

  // renders nothing, since nothing is needed
  return null;
};

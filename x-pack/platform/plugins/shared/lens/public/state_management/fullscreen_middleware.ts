/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Middleware } from '@reduxjs/toolkit';
import type { LensState, LensStoreDeps } from '@kbn/lens-common';

import { setToggleFullscreen } from './lens_slice';

export const fullscreenMiddleware =
  (storeDeps: LensStoreDeps): Middleware<{}, LensState> =>
  (store) => {
    return (next) => (action) => {
      if (setToggleFullscreen.match(action)) {
        const isFullscreen = store.getState().lens.isFullscreenDatasource;
        storeDeps.lensServices.chrome.setIsVisible(Boolean(isFullscreen));
      }
      next(action);
    };
  };

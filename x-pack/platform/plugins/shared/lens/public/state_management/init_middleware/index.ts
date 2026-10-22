/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Middleware } from '@reduxjs/toolkit';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { LensState, LensStoreDeps } from '@kbn/lens-common';
import { loadInitial as loadInitialAction } from '..';
import { loadInitial } from './load_initial';
import { readFromStorage } from '../../settings_storage';
import { AUTO_APPLY_DISABLED_STORAGE_KEY } from '../../editor_frame_service/editor_frame/workspace_panel/workspace_panel_wrapper';

const autoApplyDisabled = () => {
  return readFromStorage(new Storage(localStorage), AUTO_APPLY_DISABLED_STORAGE_KEY) === 'true';
};

export const initMiddleware =
  (storeDeps: LensStoreDeps): Middleware<{}, LensState> =>
  (store) => {
    return (next) => (action) => {
      if (loadInitialAction.match(action)) {
        return loadInitial(store, storeDeps, action.payload, autoApplyDisabled());
      }
      next(action);
    };
  };

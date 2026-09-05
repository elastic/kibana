/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { CANVAS_URL_STATE_KEY } from '../../../../../common/url_schema';
import { defaultCanvasUrlState } from './state_management/types';

export const STREAMS_CANVAS_TAB_PATH = '/new-experience/canvas';

interface CanvasFocusHistory {
  location: { search: string };
  push: (location: { pathname: string; search: string }) => void;
}

/** Persists a canvas node id so the canvas tab can select and frame it after mount. */
export const writeCanvasFocus = (
  urlStateStorageContainer: IKbnUrlStateStorage,
  focusNodeId: string
): void => {
  urlStateStorageContainer.set(
    CANVAS_URL_STATE_KEY,
    {
      ...defaultCanvasUrlState,
      focusNodeId,
    },
    { replace: true }
  );
};

/**
 * Writes focus into the current URL (synchronously), then switches to the canvas
 * tab while keeping that query so the canvas machine can read it on mount.
 */
export const navigateToCanvasFocus = (
  urlStateStorageContainer: IKbnUrlStateStorage,
  history: CanvasFocusHistory,
  focusNodeId: string
): void => {
  writeCanvasFocus(urlStateStorageContainer, focusNodeId);
  urlStateStorageContainer.kbnUrlControls.flush();
  history.push({
    pathname: STREAMS_CANVAS_TAB_PATH,
    search: history.location.search,
  });
};

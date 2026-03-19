/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

export interface LocationStateWithFromHistory {
  fromHistory?: boolean;
}

/**
 * Returns an onClick handler that navigates back to the previous page if
 * the user arrived from the history page (detected via location state),
 * otherwise falls back to pushing the given path (e.g. `/history`).
 *
 * This prevents `history.goBack()` from navigating outside the app when the
 * user opens a detail page directly (bookmark, external link, etc.).
 */
export const useGoBack = (fallbackPath: string) => {
  const history = useHistory();
  const location = useLocation<LocationStateWithFromHistory>();

  return useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      // After a full page refresh ScopedHistory is reconstructed with only the
      // current entry, so goBack() becomes a no-op even though location.state
      // is still preserved by the browser.  Check history.length to detect this.
      if (location.state?.fromHistory && history.length > 1) {
        history.goBack();
      } else {
        history.push(fallbackPath);
      }
    },
    [history, location.state?.fromHistory, fallbackPath]
  );
};

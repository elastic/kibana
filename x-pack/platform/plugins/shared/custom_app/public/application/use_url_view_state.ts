/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import type { AppDocument } from '@kbn/custom-app-common';
import { decodeView, encodeView, type ViewState } from '../runtime/view_state';

/** The name of the part of the URL that holds how the app is seen. */
export const VIEW_PARAM = 'view';

/**
 * Keeps how the app is seen, its filters, what was clicked, the open flyout and the period, in the
 * URL of the page, so that a refresh, and a link sent to someone, show the app as it was left.
 * The URL is replaced, not added to, so that the back button still means leaving the page.
 */
export const useUrlViewState = (document: Pick<AppDocument, 'state' | 'root'>) => {
  const history = useHistory();
  const { search } = useLocation();
  const encoded = new URLSearchParams(search).get(VIEW_PARAM);

  const view = useMemo(() => decodeView(document, encoded), [document, encoded]);

  const onViewChange = useCallback(
    (next: ViewState) => {
      const params = new URLSearchParams(history.location.search);
      const value = encodeView(next);
      if (value === undefined) {
        params.delete(VIEW_PARAM);
      } else {
        params.set(VIEW_PARAM, value);
      }
      const nextSearch = params.toString();
      if (nextSearch === new URLSearchParams(history.location.search).toString()) return;
      history.replace({ ...history.location, search: nextSearch ? `?${nextSearch}` : '' });
    },
    [history]
  );

  return { view, onViewChange };
};

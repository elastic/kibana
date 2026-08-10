/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useDispatch } from 'react-redux-v7';
import { distinctUntilChanged, skip } from 'rxjs';
// @ts-expect-error untyped local
import { fetchAllRenderables } from '../../../state/actions/elements';
import { coreServices } from '../../../services/kibana_services';

/**
 * Re-interprets workpad elements when the Kibana theme (dark mode / theme name)
 * changes so Canvas pick up theme-aware palette colors without a reload.
 */
export const useThemeRefresh = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const subscription = coreServices.theme.theme$
      .pipe(
        distinctUntilChanged(
          (previous, next) => previous.darkMode === next.darkMode && previous.name === next.name
        ),
        skip(1)
      )
      .subscribe(() => {
        dispatch(fetchAllRenderables());
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [dispatch]);
};

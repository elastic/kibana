/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect } from 'react';
import { ML_APP_NAME } from '../../../common/constants/app';
import type { MlRoute } from './router';
import { useMlKibana } from '../contexts/kibana';

/**
 * Handles document title automatically based on the active route.
 * Returns a callback for manual title updates.
 */
export const useDocTitle = (activeRoute: MlRoute | undefined) => {
  const activeRouteTitle = activeRoute?.title;

  const {
    services: {
      chrome: { docTitle },
    },
  } = useMlKibana();

  const updateDocTitle = useCallback(
    (title: string) => {
      docTitle.change([title, ML_APP_NAME]);
    },
    [docTitle]
  );

  useEffect(() => {
    if (activeRouteTitle) {
      updateDocTitle(activeRouteTitle);
    }
  }, [updateDocTitle, activeRouteTitle]);

  return updateDocTitle;
};

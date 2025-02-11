/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generatePath } from 'react-router-dom';
import useObservable from 'react-use/lib/useObservable';
import { useCallback } from 'react';

import { useKibana } from '../../../../common/lib/kibana';

type NavigateToCaseView = (pathParams: { caseId: string }) => void;

const CASE_DEEP_LINK_ID = 'cases';

const generateCaseViewPath = (caseId: string): string => {
  return generatePath('/:caseId', { caseId });
};

export const useCaseViewNavigation = (appId?: string) => {
  const {
    application: { navigateToApp, currentAppId$ },
  } = useKibana().services;

  const currentAppId = useObservable(currentAppId$) ?? '';

  const navigateToCaseView = useCallback<NavigateToCaseView>(
    (pathParams) =>
      navigateToApp(appId ?? currentAppId, {
        deepLinkId: CASE_DEEP_LINK_ID,
        path: generateCaseViewPath(pathParams.caseId),
      }),
    [navigateToApp, appId, currentAppId]
  );

  return { navigateToCaseView };
};

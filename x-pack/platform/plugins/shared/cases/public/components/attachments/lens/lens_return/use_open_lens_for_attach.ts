/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { first } from 'rxjs';
import { useKibana } from '../../../../common/lib/kibana';
import { useIsMainApplication } from '../../../../common/hooks';
import type { FoundSavedObject } from '../../common/saved_object/types';
import { setPendingLensAttach } from './storage';

const LENS_APP_ID = 'lens';
// Cases in the stack app is mounted under `/insightsAndAlerting/cases`. The
// embeddable state transfer concatenates `originatingPath` with that app's
// root, so for the stack we need to include the cases mount prefix; for
// solution-embedded mounts the path is already relative to the solution app.
const STACK_CASES_PATH_PREFIX = '/insightsAndAlerting/cases';

interface UseOpenLensForAttachArgs {
  caseId: string;
  caseOwner: string;
}

/**
 * Navigates to the Lens editor for an existing saved object id, recording a
 * pending-attach marker so the case view can auto-attach when the user clicks
 * "Save and return".
 */
export const useOpenLensForAttach = ({ caseId, caseOwner }: UseOpenLensForAttachArgs) => {
  const {
    services: {
      application: { currentAppId$ },
      embeddable,
      storage,
    },
  } = useKibana();
  const location = useLocation();
  const isMainApplication = useIsMainApplication();
  const originatingPath = isMainApplication
    ? `${STACK_CASES_PATH_PREFIX}${location.pathname}${location.search}`
    : `${location.pathname}${location.search}`;

  return useCallback(
    async (savedObject: FoundSavedObject) => {
      const stateTransfer = embeddable?.getStateTransfer();
      if (!stateTransfer) {
        return;
      }
      const currentAppId = await currentAppId$.pipe(first()).toPromise();
      if (!currentAppId) {
        return;
      }

      const title = savedObject.meta.title ?? savedObject.id;
      setPendingLensAttach(storage, {
        caseId,
        caseOwner,
        savedObjectId: savedObject.id,
        title,
        createdAt: Date.now(),
      });

      // Path-based navigation to the Lens edit route for the existing SO.
      await stateTransfer.navigateToEditor(LENS_APP_ID, {
        path: `#/edit/${encodeURIComponent(savedObject.id)}`,
        state: {
          originatingApp: currentAppId,
          originatingPath,
        },
      });
    },
    [caseId, caseOwner, currentAppId$, embeddable, originatingPath, storage]
  );
};

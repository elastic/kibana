/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import React, { useEffect } from 'react';
import { ExpressionWrapper } from '../expression_wrapper';
import type { LensInternalApi, LensApi } from '../types';
import { UserMessages } from '../user_messages/container';
import { useMessages } from './hooks';
import { getViewMode } from '../helper';
import { addLog } from '../logger';

export function LensEmbeddableComponent({
  internalApi,
  api,
  onUnmount,
}: {
  internalApi: LensInternalApi;
  api: LensApi;
  onUnmount: () => void;
}) {
  const [
    // Pick up updated params from the observable
    expressionParams,
    // these are blocking errors that can be shown in a badge
    // without replacing the entire panel
    blockingErrors,
  ] = useBatchedPublishingSubjects(
    internalApi.expressionParams$,
    internalApi.validationMessages$,
    // listen to view change mode but do not use its actual value
    // just call the Lens API to know whether it's in edit mode
    api.viewMode$
  );
  const canEdit = Boolean(api.isEditingEnabled?.() && getViewMode(api) === 'edit');

  const [warningOrErrors, infoMessages] = useMessages(internalApi);

  // On unmount call all the cleanups
  useEffect(() => {
    addLog(`Mounting Lens Embeddable component: ${api.defaultTitle$?.getValue()}`);
    return onUnmount;
  }, [api, onUnmount]);

  return (
    <div css={{ width: '100%', height: '100%', position: 'relative' }}>
      {expressionParams == null || blockingErrors.length ? null : (
        <ExpressionWrapper {...expressionParams} />
      )}
      <UserMessages
        blockingErrors={blockingErrors}
        warningOrErrors={warningOrErrors}
        infoMessages={infoMessages}
        canEdit={canEdit}
      />
    </div>
  );
}

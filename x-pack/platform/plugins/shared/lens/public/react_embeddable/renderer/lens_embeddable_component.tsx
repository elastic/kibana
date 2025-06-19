/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import React, { useEffect, useMemo } from 'react';
import { ExpressionWrapper } from '../expression_wrapper';
import { LensInternalApi, LensApi } from '../types';
import { UserMessages } from '../user_messages/container';
import { useMessages, useDispatcher } from './hooks';
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
    // used for functional tests
    renderCount,
    // these are blocking errors that can be shown in a badge
    // without replacing the entire panel
    blockingErrors,
    // has the render completed?
    hasRendered,
    // has view mode changed?
    latestViewMode,
  ] = useBatchedPublishingSubjects(
    internalApi.expressionParams$,
    internalApi.renderCount$,
    internalApi.validationMessages$,
    api.rendered$,
    api.viewMode$
  );
  const canEdit = Boolean(
    api.isEditingEnabled?.() && [latestViewMode, getViewMode(api)].includes('edit')
  );

  const [warningOrErrors, infoMessages] = useMessages(internalApi);

  // On unmount call all the cleanups
  useEffect(() => {
    addLog(`Mounting Lens Embeddable component: ${api.defaultTitle$?.getValue()}`);
    return onUnmount;
  }, [api, onUnmount]);

  // take care of dispatching the event from the DOM node
  const rootRef = useDispatcher(hasRendered, api);

  // Publish the data attributes only if avaialble/visible
  const title = useMemo(
    () =>
      internalApi.getDisplayOptions()?.noPanelTitle
        ? undefined
        : { 'data-title': api.title$?.getValue() ?? api.defaultTitle$?.getValue() },
    [api.defaultTitle$, api.title$, internalApi]
  );
  const description = api.description$?.getValue()
    ? {
        'data-description': api.description$?.getValue() ?? api.defaultDescription$?.getValue(),
      }
    : undefined;

  return (
    <div
      css={{ width: '100%', height: '100%', position: 'relative' }}
      data-rendering-count={renderCount + 1}
      data-render-complete={hasRendered}
      {...title}
      {...description}
      data-shared-item
      ref={rootRef}
    >
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

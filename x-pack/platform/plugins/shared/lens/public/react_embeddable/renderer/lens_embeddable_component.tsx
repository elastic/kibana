/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { RuleFormFlyout } from '@kbn/response-ops-rule-form/flyout';
import React, { useCallback, useEffect, useMemo } from 'react';
import { isValidRuleFormPlugins } from '@kbn/response-ops-rule-form/lib';
import { ES_QUERY_ID } from '@kbn/rule-data-utils';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import { ExpressionWrapper } from '../expression_wrapper';
import { LensInternalApi, LensApi, LensEmbeddableStartServices } from '../types';
import { UserMessages } from '../user_messages/container';
import { useMessages, useDispatcher } from './hooks';
import { getViewMode } from '../helper';
import { addLog } from '../logger';

export function LensEmbeddableComponent({
  internalApi,
  api,
  services,
  onUnmount,
}: {
  internalApi: LensInternalApi;
  api: LensApi;
  services: LensEmbeddableStartServices;
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
    isRuleFormVisible,
    alertRuleInitialValues,
    { ruleTypeRegistry, actionTypeRegistry },
  ] = useBatchedPublishingSubjects(
    internalApi.expressionParams$,
    internalApi.renderCount$,
    internalApi.validationMessages$,
    api.rendered$,
    internalApi.isRuleFormVisible$,
    internalApi.alertRuleInitialValues$,
    internalApi.alertingTypeRegistries$,
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

  const ruleFormPlugins = useMemo(
    () => ({
      ...services,
      ...services.coreStart,
      http: services.coreHttp,
    }),
    [services]
  );
  const canShowRuleForm =
    isValidRuleFormPlugins(ruleFormPlugins) && ruleTypeRegistry && actionTypeRegistry;
  const closeRuleForm = useCallback(
    () => internalApi.isRuleFormVisible$.next(false),
    [internalApi.isRuleFormVisible$]
  );
  const alertRuleTitle = useMemo(
    () =>
      i18n.translate('xpack.lens.embeddable.alertRuleTitle', {
        defaultMessage: '{title} rule',
        values: {
          title: title
            ? title['data-title']
            : i18n.translate('xpack.lens.embeddable.alertRuleTitle.defaultName', {
                defaultMessage: 'Elasticsearch query from visualization',
              }),
        },
      }),
    [title]
  );

  return (
    <div
      style={{ width: '100%', height: '100%' }}
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
      {isRuleFormVisible && canShowRuleForm && (
        <KibanaContextProvider services={ruleFormPlugins}>
          <RuleFormFlyout
            plugins={{ ...ruleFormPlugins, ruleTypeRegistry, actionTypeRegistry }}
            ruleTypeId={ES_QUERY_ID}
            initialValues={{ ...alertRuleInitialValues, name: alertRuleTitle }}
            onCancel={closeRuleForm}
            onSubmit={closeRuleForm}
          />
        </KibanaContextProvider>
      )}
    </div>
  );
}

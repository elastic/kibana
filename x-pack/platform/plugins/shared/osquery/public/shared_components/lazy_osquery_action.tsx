/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense, useMemo } from 'react';
import type { Ecs } from '@kbn/cases-plugin/common';
import ServicesWrapper from './services_wrapper';
import type { ServicesWrapperProps } from './services_wrapper';
import type { OsqueryActionProps } from './osquery_action';
import { AlertAttachmentContext } from '../common/contexts';

const OsqueryAction = lazy(() => import('./osquery_action'));

interface LazyOsqueryActionServices {
  services: ServicesWrapperProps['services'];
}

export const getLazyOsqueryAction =
  ({ services }: LazyOsqueryActionServices) =>
  // eslint-disable-next-line react/display-name
  (props: OsqueryActionProps & { ecsData?: Ecs }) => {
    const { ecsData, ...restProps } = props;
    const alertId = ecsData?._id;

    // `alertIds` is what makes the server load the alert document and substitute
    // `{{parameter}}` itself. Without it the request carries no `alert_ids`, the server has
    // no alert context, and the literal template would reach the agent.
    const defaultValues = useMemo(
      () =>
        alertId ? { ...restProps.defaultValues, alertIds: [alertId] } : restProps.defaultValues,
      [alertId, restProps.defaultValues]
    );

    return (
      <Suspense fallback={null}>
        <ServicesWrapper services={services}>
          {ecsData && alertId ? (
            <AlertAttachmentContext.Provider value={ecsData}>
              <OsqueryAction {...restProps} defaultValues={defaultValues} />
            </AlertAttachmentContext.Provider>
          ) : (
            <OsqueryAction {...restProps} />
          )}
        </ServicesWrapper>
      </Suspense>
    );
  };

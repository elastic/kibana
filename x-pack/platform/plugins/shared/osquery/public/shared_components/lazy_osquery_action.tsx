/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
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

    return (
      <Suspense fallback={null}>
        <ServicesWrapper services={services}>
          {ecsData?._id ? (
            <AlertAttachmentContext.Provider value={ecsData}>
              <OsqueryAction {...restProps} />
            </AlertAttachmentContext.Provider>
          ) : (
            <OsqueryAction {...restProps} />
          )}
        </ServicesWrapper>
      </Suspense>
    );
  };

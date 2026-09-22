/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { lazy, Suspense } from 'react';
import type { OsqueryResponseActionsParamsFormProps } from './osquery_response_action_type';
import { ExperimentalFeaturesProvider } from '../common/experimental_features_context';
import { ExperimentalFeaturesService } from '../common/experimental_features_service';

const OsqueryResponseActionParamsForm = lazy(() => import('./osquery_response_action_type'));

export const getLazyOsqueryResponseActionTypeForm =
  // eslint-disable-next-line react/display-name
  () => (props: OsqueryResponseActionsParamsFormProps) => {
    const { onError, defaultValues, onChange } = props;

    return (
      <Suspense fallback={<EuiLoadingSpinner />}>
        <ExperimentalFeaturesProvider value={ExperimentalFeaturesService.get()}>
          <OsqueryResponseActionParamsForm
            onChange={onChange}
            defaultValues={defaultValues}
            onError={onError}
          />
        </ExperimentalFeaturesProvider>
      </Suspense>
    );
  };

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { Suspense } from 'react';
import type { CreateIntegrationSideCardButtonComponent } from './types';

const CreateIntegrationSideCardButton = React.lazy(() =>
  import('./create_integration_card_button').then((module) => ({
    default: module.CreateIntegrationSideCardButton,
  }))
);

export const getCreateIntegrationSideCardButtonLazy =
  (): CreateIntegrationSideCardButtonComponent =>
    React.memo(function CreateIntegrationSideCardButtonLazy(props) {
      return (
        <Suspense fallback={<EuiLoadingSpinner size="l" />}>
          <CreateIntegrationSideCardButton {...props} />
        </Suspense>
      );
    });

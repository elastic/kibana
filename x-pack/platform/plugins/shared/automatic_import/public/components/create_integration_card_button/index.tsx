/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { Suspense } from 'react';
import type { CreateIntegrationCardButtonComponent } from './types';

const CreateIntegrationCardButton = React.lazy(() =>
  import('./create_integration_card_button').then((module) => ({
    default: module.CreateIntegrationCardButton,
  }))
);

export const getCreateIntegrationCardButtonLazy = (): CreateIntegrationCardButtonComponent =>
  React.memo(function CreateIntegrationCardButtonLazy(props) {
    return (
      <Suspense fallback={<EuiLoadingSpinner size="l" />}>
        <CreateIntegrationCardButton {...props} />
      </Suspense>
    );
  });

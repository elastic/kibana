/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { ExperimentalFeaturesService } from '../../../../services';
import { useStartServices, useBreadcrumbs } from '../../../../hooks';

export const CreateIntegration = React.memo(() => {
  const { automaticImport, automaticImportVTwo } = useStartServices();
  useBreadcrumbs('integration_create');

  const useVTwo = ExperimentalFeaturesService.get().newBrowseIntegrationUx;
  const CreateAutomaticImport = useVTwo
    ? automaticImportVTwo?.components.CreateIntegration
    : automaticImport?.components.CreateIntegration;

  return CreateAutomaticImport ? <CreateAutomaticImport /> : null;
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { Route, Routes } from '@kbn/shared-ux-router';

import { DatasetWizardPage } from './create_dataset_wizard';
import { DataFederationHome } from './data_federation_home';

export const Main: FunctionComponent = () => (
  <Routes>
    <Route path="/create" component={DatasetWizardPage} />
    <Route path="/edit/:datasetName" component={DatasetWizardPage} />
    <Route path="/" component={DataFederationHome} />
  </Routes>
);

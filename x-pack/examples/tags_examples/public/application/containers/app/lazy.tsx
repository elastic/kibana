/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { lazy, Suspense } from 'react';
import { Props } from './app';

const AppLazy = lazy(() =>
  import('./app').then((module) => ({
    default: module.App,
  }))
);

export const App: React.FC<Props> = (props) => (
  <Suspense fallback={<></>}>
    <AppLazy {...props} />
  </Suspense>
);

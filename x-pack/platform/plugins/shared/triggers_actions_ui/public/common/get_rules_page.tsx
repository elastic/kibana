/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { TriggersAndActionsUiServices } from '../application/rules_app';

const RulesPageApp = lazy(() =>
  import('../application/rules_page_app').then((module) => ({
    default: module.RulesPageApp,
  }))
);

const Fallback = () => (
  <EuiLoadingSpinner
    size="xl"
    style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}
  />
);

export const getRulesPageLazy = (deps: TriggersAndActionsUiServices) => {
  return (
    <Suspense fallback={<Fallback />}>
      <RulesPageApp deps={deps} />
    </Suspense>
  );
};

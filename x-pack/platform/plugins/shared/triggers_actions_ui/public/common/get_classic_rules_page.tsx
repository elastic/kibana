/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  ClassicRulesPageInternalDeps,
  ClassicRulesPageProps,
} from '../application/classic_rules_page';

const LazyComposableClassicRulesPage = React.lazy(() =>
  import('../application/composable_rules_page').then((m) => ({
    default: m.ComposableClassicRulesPage,
  }))
);

export const getClassicRulesPageLazy = (
  props: ClassicRulesPageProps & { internalDeps: ClassicRulesPageInternalDeps }
) => (
  <React.Suspense fallback={null}>
    <LazyComposableClassicRulesPage {...props} />
  </React.Suspense>
);

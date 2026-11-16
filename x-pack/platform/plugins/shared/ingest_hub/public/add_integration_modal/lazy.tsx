/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';

/**
 * The Add integration experience, for hosts outside Ingest Hub (e.g. Streams).
 * Lazy so that hosts only pay for the catalogue chunk when the modal is opened.
 * Render it inside a `<Suspense>` boundary.
 */
export const LazyAddIntegrationModal = lazy(() =>
  import('./add_integration_modal').then((module) => ({ default: module.AddIntegrationModal }))
);

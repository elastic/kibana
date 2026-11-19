/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';

/**
 * The Add integration experience, for hosts outside the Integrations app (e.g. Streams).
 * Lazy so that hosts only pay for the chunk when the modal is opened. Render it inside a
 * `<Suspense>` boundary.
 *
 * The chunk name deliberately matches the Integrations app mount in `plugin.ts`. Kibana's
 * optimizer promotes any module referenced by three or more chunks into `shared-plugins` /
 * `vendors`, which are page-load bundles (`config/split_chunks.ts`, `minChunks: 3`). The pages this
 * modal mounts are already referenced by the Fleet app chunk and the Integrations app chunk; a
 * third chunk would push them — and their vendor tail — onto every page load, measured at ~285 KB.
 * Sharing the app's chunk keeps the count at two.
 */
export const LazyAddIntegrationModal = lazy(() =>
  import(/* webpackChunkName: "fleet-integrations-app" */ './add_integration_modal').then(
    (module) => ({ default: module.AddIntegrationModal })
  )
);

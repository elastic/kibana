/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

/**
 * Lazy so the modal trees (React Query hooks, forms, translations, user-profile API) stay out of
 * this plugin's page load bundle. Render inside `EscalationModalBoundary`, and inside the
 * consumer's own `KibanaContextProvider` + `QueryClientProvider` so the modals invalidate the
 * consumer's cache.
 */
export const LazyConnectedEscalationModal = React.lazy(() =>
  import('./escalation_modal/connected_escalation_modal').then(({ ConnectedEscalationModal }) => ({
    default: ConnectedEscalationModal,
  }))
);

export const LazyConnectedCloseInvestigationModal = React.lazy(() =>
  import('./connected_status/connected_close_investigation_modal').then(
    ({ ConnectedCloseInvestigationModal }) => ({ default: ConnectedCloseInvestigationModal })
  )
);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';

import { getFleetAppServices } from '../../services/start_services';

import type { CloseAddIntegrationModal, OpenAddIntegrationModalOptions } from './types';

/**
 * Opens the Add integration experience in a modal owned by Fleet.
 *
 * The host never imports the modal, the Integrations routes or any provider — it calls a function.
 * That is the point: a React component on the start contract makes its whole import graph
 * reachable from the consuming bundle's entry, and Kibana's optimizer then promotes that graph into
 * the shared page-load bundles that every page downloads (measured at ~284 KB). Here the dynamic
 * `import()` resolves inside Fleet's own bundle, so the experience stays in a Fleet async chunk and
 * is fetched on first open.
 */
export async function openAddIntegrationModal(
  options: OpenAddIntegrationModalOptions = {}
): Promise<CloseAddIntegrationModal> {
  const { startServices } = getFleetAppServices();

  // Same chunk name as the Integrations app mount in `plugin.ts`, deliberately. Kibana's optimizer
  // promotes any module referenced by three or more chunks into `shared-plugins` / `vendors`, which
  // are page-load bundles (`config/split_chunks.ts`, `minChunks: 3`). The Integrations pages are
  // already referenced by the Fleet app chunk and the Integrations app chunk; giving the modal its
  // own chunk would make three and push ~285 KB onto every page load. Sharing the app's chunk keeps
  // the count at two: opening the modal downloads that chunk, and page load is untouched.
  const { AddIntegrationModal } = await import(
    /* webpackChunkName: "fleet-integrations-app" */ './add_integration_modal'
  );

  const container = document.createElement('div');
  container.className = 'fleetAddIntegrationModalHost';
  document.body.appendChild(container);
  const root = createRoot(container);

  let closed = false;
  const close: CloseAddIntegrationModal = () => {
    if (closed) {
      return;
    }
    closed = true;
    root.unmount();
    container.remove();
    options.onClose?.();
  };

  root.render(
    startServices.rendering.addContext(
      <AddIntegrationModal
        onClose={close}
        title={options.title}
        subtitle={options.subtitle}
        initialPath={options.initialPath}
      />
    )
  );

  return close;
}
